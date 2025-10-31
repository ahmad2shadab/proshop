# ProShop: Online Store Application

ProShop is a fully-featured e-commerce platform designed to provide a seamless shopping experience. It includes everything from user interaction with products to comprehensive administrative management tools

## Live Preview

Access the live application here: [ProShop Live Site](https://ahmad2shadab-proshop.netlify.app)

## Preview

![ProShop Preview](frontend/public/assets/images/screens.png)

## Features

### General Features

- **Full featured shopping cart**: Users can add items to their cart, adjust quantities, and proceed to checkout.
- **Product reviews and ratings**: Customers can review products and rate them based on their experiences.
- **Top products carousel**: Highlights and displays top-rated or popular products on the home page.
- **Product pagination**: Allows efficient browsing through products via pagination to enhance user experience.
- **Product search feature**: Enables users to search for products using keywords.
- **User profile with orders**: Users can view their profile and track their order history.

### Checkout Process

- **Checkout process**: Integrated checkout process including entry of shipping details and selection of payment method.
- **PayPal / credit card integration**: Secure payment integration that supports both PayPal and credit card transactions.

### Admin Features

- **Admin product management**: Admins can add, edit, and remove products.
- **Admin user management**: Manage user accounts to ensure compliance with store policies.
- **Admin Order details page**: View and manage the details of orders placed by customers.
- **Mark orders as delivered**: Admins can update order statuses to reflect delivery status.

### Extra Tools

- **Database seeder (products & users)**: Easily populate the database with initial data for products and users, useful for testing and development.

## Technologies Used

- Frontend: HTML, CSS, JavaScript (React.js)
- Backend: Node.js, Express
- Database: MongoDB
- Payment Processing: PayPal SDK, Stripe API

## Getting Started

### Prerequisites

- JavaScript
- React.js
- Node.js
- MongoDB
- npm or yarn

### Installing

Clone the repository to your local machine:

```bash
git clone https://github.com/ahmad2shadab/proshop.git
cd proshop
```

Install the required dependencies:

```bash
npm install
```

Seed the database:

```bash
npm run seed
```

**Running the Application**

Start the server:

```bash
npm start
```

Open your browser and navigate to:

```arduino
http://localhost:portNumber
```

**Usage**

After setting up the project, you can register as a new user or log in using seeded user credentials to explore both user and admin functionalities.

**Contributing**

Contributions to improve the application are welcome. Please fork the repository and create a pull request with your features or fixes.

**License**

This project is licensed under the MIT License.
import cron from "node-cron";
import Imap from "node-imap";
import { simpleParser } from "mailparser";
import fs from "fs";
import path from "path";
import logger from "../utils/logger.js";
import Ticket from "../models/Ticket.js";
import EmailLog from "../models/EmailLog.js";
import generateTicketId from "../utils/generateTicketId.js";

const imapConfig = {
  user: process.env.IMAP_USER,
  password: process.env.IMAP_PASSWORD,
  host: process.env.IMAP_HOST,
  port: process.env.IMAP_PORT,
  tls: process.env.IMAP_TLS === "true",
  tlsOptions: { rejectUnauthorized: false },
};

// --- FIX: ADDED MISSING HELPER FUNCTIONS ---

const openInbox = (imap) => {
  return new Promise((resolve, reject) => {
    imap.openBox("INBOX", false, (err, box) => {
      if (err) return reject(err);
      resolve(box);
    });
  });
};

const searchEmails = (imap, sinceDate = null) => {
  return new Promise((resolve, reject) => {
    // This logic now uses the sinceDate if provided
    const searchCriteria = sinceDate
      ? ["UNSEEN", ["SINCE", sinceDate.toISOString()]]
      : ["UNSEEN"];

    imap.search(searchCriteria, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// --- END OF FIX ---

// --- Helper: Check for Junk/Automated Emails ---
const isJunkEmail = (subject, fromEmail) => {
  const lowerSubject = subject?.toLowerCase() || "";
  const lowerFrom = fromEmail?.toLowerCase() || "";

  if (lowerFrom.includes("mailer-daemon") || lowerFrom.includes("postmaster")) {
    return true;
  }
  if (
    lowerSubject.includes("delivery status notification") ||
    lowerSubject.includes("out of office") ||
    lowerSubject.includes("undeliverable")
  ) {
    return true;
  }
  return false;
};

// --- Helper: Find Existing Ticket from Reply ---
const findTicketByReference = async (inReplyTo, references) => {
  const referenceIds = [];
  if (inReplyTo) {
    referenceIds.push(inReplyTo);
  }
  if (references) {
    // References can be a single ID or a space-separated string of IDs
    referenceIds.push(...references.split(" "));
  }

  if (referenceIds.length === 0) {
    return null;
  }

  // Find a ticket where its original messageId is one of the references
  const ticket = await Ticket.findOne({
    messageIdHeader: { $in: referenceIds },
  });
  return ticket;
};

// --- Helper: Process and Save Attachments ---
const processAttachments = (parsedEmail, seqno) => {
  const attachmentFilenames = [];
  if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
    for (const attachment of parsedEmail.attachments) {
      // FIX: Check for missing filename to prevent crash
      if (attachment.filename) {
        const sanitizedFilename = path.basename(attachment.filename);
        const uniqueFilename = `${Date.now()}-${sanitizedFilename}`;
        const uploadPath = path.join(process.cwd(), "uploads", uniqueFilename);
        fs.writeFileSync(uploadPath, attachment.content);
        attachmentFilenames.push(uniqueFilename);
      } else {
        logger.warn(
          `Skipping attachment with no filename on email seqno ${seqno}.`,
        );
      }
    }
  }
  return attachmentFilenames;
};

// --- Helper: Add Reply to an Existing Ticket ---
const appendReplyToTicket = async (ticket, parsedEmail) => {
  const replyBody = parsedEmail.text || parsedEmail.html || "No Content";
  const sender = parsedEmail.from?.text || "Unknown Sender";

  ticket.history.push({
    user: sender, // Attribute reply to the sender
    action: `New reply received: \n\n${replyBody}`,
    timestamp: new Date(),
  });

  // Optionally, update status if it was 'Resolved'
  if (ticket.status === "Resolved" || ticket.status === "Closed") {
    ticket.status = "In_Progress"; // Re-open the ticket
  }

  await ticket.save();
  logger.info(`Appended reply from ${sender} to ticket ${ticket.ticketId}.`);
  // Here you would also emit a socket event to notify agents of the update
};

// --- Helper: Create a New Ticket ---
const createNewTicket = async (parsedEmail, messageId, attachmentFilenames) => {
  const intelligentTicketId = await generateTicketId();

  const newTicket = new Ticket({
    ticketId: intelligentTicketId,
    subject: parsedEmail.subject || "No Subject",
    fromEmail: parsedEmail.from?.text || "Unknown Sender",
    body: parsedEmail.text || parsedEmail.html || "No Content",
    status: "Unassigned",
    attachments: attachmentFilenames,
    messageIdHeader: messageId || null, // Store the Message-ID for threading
    history: [
      {
        user: "System",
        action: `Ticket created from email by ${
          parsedEmail.from?.text || "Unknown Sender"
        }`,
        timestamp: new Date(),
      },
    ],
  });
  await newTicket.save();
  logger.info(
    `Successfully created ticket ${newTicket.ticketId} for: ${newTicket.subject}`,
  );
  // Here you would also emit a socket event to notify admins of the new ticket
};

// --- Main Email Processing Function ---
const processEmailStream = async (stream, seqno, imap) => {
  let parsedEmail;
  try {
    parsedEmail = await simpleParser(stream);
  } catch (parseError) {
    logger.error(`Error parsing email seqno ${seqno}:`, parseError);
    return "error";
  }

  const { messageId, inReplyTo, references, subject, from } = parsedEmail;
  const fromEmail = from?.text || "Unknown Sender";

  try {
    // 1. Filter out junk
    if (isJunkEmail(subject, fromEmail)) {
      logger.info(`Skipping junk email: ${subject}`);
      return "skipped";
    }

    // 2. Handle Attachments (do this once)
    const attachmentFilenames = processAttachments(parsedEmail, seqno);

    // 3. Check for Reply
    const existingTicket = await findTicketByReference(inReplyTo, references);
    if (existingTicket) {
      await appendReplyToTicket(existingTicket, parsedEmail);
      // We still mark the email as 'Seen'
      imap.addFlags(seqno, ["\\Seen"], (err) => {
        if (err) logger.error(`Error marking reply ${seqno} as seen:`, err);
      });
      return "processed";
    }

    // 4. Handle as New Ticket
    // FIX: Guard for missing messageId. We'll still process it,
    // but we can't log it to prevent duplicates.
    if (!messageId) {
      logger.warn(
        `Email ${seqno} has no message-id. Processing, but cannot guarantee uniqueness.`,
      );
      await createNewTicket(parsedEmail, null, attachmentFilenames);
      imap.addFlags(seqno, ["\\Seen"], (err) => {
        if (err) logger.error(`Error marking email ${seqno} as seen:`, err);
      });
      return "processed";
    }

    // 5. Atomic "Claim-First" Strategy
    try {
      // Try to "claim" the messageId.
      await EmailLog.create({ messageId });

      // If successful, create the ticket
      await createNewTicket(parsedEmail, messageId, attachmentFilenames);

      // Mark email as seen *after* processing
      imap.addFlags(seqno, ["\\Seen"], (err) => {
        if (err) logger.error(`Error marking email ${seqno} as seen:`, err);
      });
      return "processed";
    } catch (claimError) {
      if (claimError.code === 11000) {
        // Duplicate key error - messageId already claimed
        logger.warn(`Skipping duplicate email (already claimed): ${subject}`);
        return "skipped";
      } else {
        // This is a real database error
        throw claimError;
      }
    }
  } catch (error) {
    logger.error(
      `Error processing email stream for seqno ${seqno} (${subject}):`,
      error,
    );
    return "error";
  }
};

// --- Main IMAP Fetcher Function ---
export const runEmailFetcher = async (options = {}) => {
  const { sinceDate = null } = options;
  const imap = new Imap(imapConfig);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  imap.once("error", (err) => logger.error("IMAP connection error:", err));
  imap.once("end", () => logger.info("IMAP connection ended."));

  try {
    await new Promise((resolve, reject) => {
      imap.once("ready", resolve);
      imap.once("error", reject);
      imap.connect();
    });

    logger.info("IMAP connection ready. Opening inbox...");
    await openInbox(imap);

    const results = await searchEmails(imap, sinceDate); // <-- This will now work
    if (results.length === 0) {
      logger.info("No new unseen emails found.");
      return;
    }

    logger.info(`Found ${results.length} unseen email(s). Processing...`);

    for (const seqno of results) {
      const fetch = imap.fetch([seqno], { bodies: "" });
      const status = await new Promise((resolve, reject) => {
        fetch.on("message", (msg) => {
          msg.on("body", async (stream) => {
            // Wait for the stream processing to finish
            const result = await processEmailStream(stream, seqno, imap);
            resolve(result);
          });
        });
        fetch.once("error", reject);
      });

      if (status === "processed") processedCount++;
      else if (status === "skipped") skippedCount++;
      else if (status === "error") errorCount++;
    }

    logger.info(
      `Fetch cycle complete. Found: ${results.length}, Processed: ${processedCount}, Skipped: ${skippedCount}, Errored: ${errorCount}`,
    );
  } catch (error) {
    logger.error("An error occurred during email fetching:", error);
  } finally {
    if (imap.state !== "disconnected") {
      imap.end();
    }
  }
};

// --- Cron Job Scheduler ---
const emailFetcherJob = cron.schedule(
  "*/30 * * * *", // Runs every 30 minutes
  () => {
    // --- UPDATED LOGIC ---
    // Calculate 30 minutes ago to scope the search
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    logger.info(
      `Running scheduled email fetcher job (since: ${thirtyMinutesAgo.toISOString()})...`,
    );

    // Pass the calculated date to the fetcher
    runEmailFetcher({ sinceDate: thirtyMinutesAgo });
    // --- END OF UPDATE ---
  },
  { scheduled: true },
);

export default emailFetcherJob;

