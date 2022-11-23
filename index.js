const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;

const app = express();

// middleware 
app.use(cors());
app.use(express.json());

app.get('/',(req,res)=>{
    res.send('We sell server is Running here');
});

app.listen(port, ()=>{
    console.log(`We sell server is running on port ${port}`);
})
