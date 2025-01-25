// import express, { request, urlencoded } from "express";
const express = require('express')
const app = express();
const port = 3000;


app.use(express.json());

app.get("/" , (req,res)=>{
    console.log("Get Request Succesfully");
    res.send("Get request succesfully initlized");
});

app.put("/put",(req , res)=>{
    console.log("put request succesfully");
     console.log(req.body);
     res.send("Data update request succefully");
});

app.post("/post",(req, res)=>{
    console.log("Post requets succesfully");
    console.log(req.body);
    res.send("post request recived for data");
});

app.listen(port, ()=>{
    console.log(`server running on localhost ${port}`);
})