const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

// middlewre 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bkdzfxe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        const categoriesCollection = client.db('weSell').collection('categories');
        const usersCollection = client.db('weSell').collection('users');
        const productsCollection = client.db('weSell').collection('products');
        const ordersCollection = client.db('weSell').collection('orders');

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/categoriesType', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });

        app.post('/categories', verifyJwt, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        app.get('/categories/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.get('/advertiseproducts', async (req, res) => {
            const query = { advertise: true };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
     

        app.delete('/product/:id', verifyJwt, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        });

        app.put('/product/:id', verifyJwt, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'seller' })
        });

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        });

        app.get('/myproducts', verifyJwt,verifySeller, async (req, res) => {
            const email = req.query.email;
            console.log(email);
            const decodedEmail = req.decoded.email;

            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = {
                email: email
            }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });
        
        app.get('/advertiseproducts', verifyJwt,verifySeller, async (req, res) => {
            const query = {
                advertise: true
            }
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body
            console.log(order);
            const query = {
                email: order.email,
                productName: order.productName
            }

            const alreadyBooked = await ordersCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You have already booked ${order.productName}`;
                return res.send({ acknowledged: false, message })
            }
            const result = await ordersCollection.insertOne(order);
            res.send(result);
        });




    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('We sell server is Running here');
});

app.listen(port, () => {
    console.log(`We sell server is running on port ${port}`);
})
