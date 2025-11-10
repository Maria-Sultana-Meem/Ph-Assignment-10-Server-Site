const express = require('express')
const cors = require('cors')
const admin = require("firebase-admin");

const serviceAccount = require("./firebase-adminsdk.json");
require('dotenv').config()
const app = express()
const port =process.env.PORT || 3000

app.use(cors())
app.use(express.json())



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.x08ux7h.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyToken = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({
      message: "unauthorized access. Token not found!",
    });
  }

  const token = authorization.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; 
    next();
  } catch (error) {
    console.error(error);
    res.status(401).send({
      message: "unauthorized access.",
    });
  }
};




async function run() {
  try {
    
    await client.connect();

   const db = client.db('freelance_db')
    const jobsCollection = db.collection('allJobs')
    const acceptCollection =db.collection('my-accepted-tasks')


  // get data
    app.get('/latest-jobs',async(req,res)=>{
      const result = await jobsCollection.find().sort({_id:-1}).limit(6).toArray()
      res.send(result)
    })
    app.get('/allJobs',async(req,res)=>{
      const result = await jobsCollection.find().toArray()
      res.send(result)
    })
    app.get('/allJobs/:id',async(req,res)=>{
      const {id}=req.params
      const objectId = new ObjectId(id)
      const result = await jobsCollection.findOne({ _id: objectId })
      res.send(result)
    })
    app.get('/my-accepted-task',async(req,res)=>{
      const result =await acceptCollection.find().toArray()
      res.send(result)
    })
   app.get('/myAddedJob', verifyToken, async (req, res) => {
      try {
        const email = req.user.email;
        const result = await jobsCollection.find({ userEmail: email }).toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch jobs" });
      }
    });


//  post data
   app.post('/my-accepted-task',verifyToken, async(req,res)=>{
  const data = req.body
  data.acceptedBy = req.user.email; 
  data.acceptedAt = new Date();
  const result = await acceptCollection.insertOne(data)
  res.send(result)
})
  app.post('/addJob', verifyToken, async (req, res) => {
      try {
        const newJob = req.body;
        newJob.userEmail = req.user.email;
        newJob.postedBy = req.user.name || req.user.email;
        newJob.postedAt = new Date();
        const result = await jobsCollection.insertOne(newJob);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to add job" });
      }
    });
// delete
app.delete('/my-accepted-task/:id',async(req,res)=>{
  const { id } = req.params;
  const result = await acceptCollection.deleteOne({ _id: new ObjectId(id) })
  res.send(result)
})
app.delete('/deleteJob/:id', async (req, res) => {
  const { id } = req.params;
  const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});
  // update
  app.put('/allJobs/:id',async(req,res)=>{
    const {id}=req.params
 
    const data = req.body
    const objectId = new ObjectId(id);
          const filter = { _id: objectId };
          const update = {
            $set: data,
          };
    
          const result = await jobsCollection.updateOne(filter, update);
           
          res.send(result)
  })
    


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Server Running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

