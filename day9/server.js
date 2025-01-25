const express = require('express')
const app =express();
const port = 3000;
const mongoose = require('mongoose')
const BrandName=require('./model')


mongoose.connect("mongodb://localhost:27017/demo").then(
    ()=> {console.log('DB  Connected')}
).catch(err=>console.log(e));


app.use(express.json());

app.get('/getbrands',async(req,res) => {
    try{
        const allData = await BrandName.find()
        return res.json(allData)
    }
    catch(err){
        console.log(err)
    }
});

//display on ebrand

app.get('/getbrands/:id',async(req,res) => {
    try{
        const allData = await BrandName.findById(req.params.id)
        return res.json(allData)
    }
    catch(err){
        console.log(err)
    }
});

app.post('/addbrands',async(req,res)=>{
    const {brandname}=req.body
    try{
        const newData = new BrandName({brandname})
        await newData.save()
        return res.json(await BrandName.find());
    }
    catch(err)
    {
        console.log(err)
    }
});

// deleting brand
app.delete('/deletebrand/:id',async(req,res) => {
    try{
        await BrandName.findByIdAndDelete(req.params.id);
        return res.json(await BrandName.find())
    }
    catch(err){
        console.log(err.message)
    }
});

app.listen(port,() => {
    console.log(`Listening to port ${port}`)
})