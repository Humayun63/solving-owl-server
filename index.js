const express = require('express');
const app = express()
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json())

// JWT Verify
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }

    const token = authorization.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
    })
}


// mongoDB


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nucgrat.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const problemsCollection = client.db('solvingOwl').collection('problems')
        const usersCollection = client.db('solvingOwl').collection('users')

        // Create JWT Token
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_KEY, { expiresIn: '1h' })
            res.send({ token })
        })

        // Users Related API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }

            const loggedUser = await usersCollection.findOne(query)
            if (loggedUser) {
                return res.send({ message: 'Already Exits' })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        // Single User details
        app.get('/users/single-user', verifyJWT, async (req, res) => {
            const { email } = req.body;
            const query = { email: email }

            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden Access' })
            }

            const user = await usersCollection.findOne(query)
            if (!user) {
                return res.status(404).send({ error: true, message: 'User not found' })
            }else{
                res.send(user)
            }

        })

        // Add solved id to users collection
        app.patch('/user/solved', verifyJWT, async (req, res) => {
            const { email, problemId } = req.body;
            const query = { email: email }

            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden Access' })
            }

            const user = await usersCollection.findOne(query)
            if (!user) {
                return res.status(404).send({ error: true, message: 'User not found' })
            }

            if (!user.solved) {
                user.solved = [problemId]
            } else if (user.solved.includes(problemId)) {
                return res.send({ message: 'Already Solved' })
            } else {
                user.solved.push(problemId)
            }

            const result = await usersCollection.updateOne(query, {
                $set: {
                    solved: user.solved
                }
            })

            res.send(result)
        })

        // All Problems
        app.get('/all-problems', async (req, res) => {
            const result = await problemsCollection.find({}, { projection: { title: 1, _id: 1, level: 1 } }).toArray()
            res.send(result)
        })

        // Easy Problems 
        app.get('/easy-problems', async (req, res) => {
            const query = { level: "easy" }
            const result = await problemsCollection.find(query, { projection: { title: 1, _id: 1, level: 1 } }).toArray()
            res.send(result)
        })

        // Medium Problems 
        app.get('/medium-problems', async (req, res) => {
            const query = { level: "medium" }
            const result = await problemsCollection.find(query, { projection: { title: 1, _id: 1, level: 1 } }).toArray()
            res.send(result)
        })

        // Advance Problems 
        app.get('/advance-problems', async (req, res) => {
            const query = { level: "advance" }
            const result = await problemsCollection.find(query, { projection: { title: 1, _id: 1, level: 1 } }).toArray()
            res.send(result)
        })

        // Single Problem
        app.get('/problem/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await problemsCollection.find(query).toArray()
            res.send(result)
        })


        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Owl is solving the problems!')
})

app.listen(port, () => {
    console.log(`Owl is solving at ${port}`)
})