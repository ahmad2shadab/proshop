# ProShop: Online Store Application

ProShop is a fully-featured e-commerce platform designed to provide a seamless shopping experience. It includes everything from user interaction with products to comprehensive administrative management tools.

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
http://localhost:3000
```

**Usage**

After setting up the project, you can register as a new user or log in using seeded user credentials to explore both user and admin functionalities.

**Contributing**

Contributions to improve the application are welcome. Please fork the repository and create a pull request with your features or fixes.

**License**

This project is licensed under the MIT License - see the LICENSE.md file for details.
