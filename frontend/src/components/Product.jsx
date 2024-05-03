// import bootstrap
import { Card } from 'react-bootstrap';
// import link
import { Link } from 'react-router-dom';


const Product = ({ product }) => {
  return (
    <Card className="my-3 p-3 rounded">
      <Link to={`/product/${product._id}`}>
        <Card.Img src={product.img} variant="top" />
      </Link>

      <Card.Body>
        <Link to={`/product/${product._id}`}>
          <Card.Title as="div">
            <strong>{product.name}</strong>
          </Card.Title>
        </Link>

        <Card.Body as="h3">${product.price}</Card.Body>
      </Card.Body>
    </Card>
  );
};
export default Product;
