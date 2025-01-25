var express = require('express');
var app =express();

// app.get("/:id",function(req,res) {
    // res.send(`<h1> The id you specified is :  ${req.params.id} `);
// });
// 
app.get("/things/:id[0-9]{4}",function(req,res) {
    res.send(`<h1> The id you specified is :  ${req.params.id} `);
});


app.listen(2000);