const express = require('express');
const app = express();
const path = require('path');

const port = 3000   
app.set('view engine','ejs');

app.get('/',(req,res) => {
    const username = "Amrutvahini College Of Engineering"
    res.render('home', {username:username});
});

app.listen(port, ()=>{
    console.log(`server running on localhost ${port}`);
})