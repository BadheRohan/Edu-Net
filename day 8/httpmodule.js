// const http = require('http')
// 
// const myServer = http.createServer((req,res)=>{
    // res.write('welcome to avcoe');
    // res.end()
// })
// myServer.listen(5000)
const http = require('http')

    const server = http.createServer((req,res) =>{
        if(req.url === '/'){
            res.write("<h1 style='color:black'>welcome to avcoe</h1>");
            res.end()
        }else if(req.url === '/about')
            res.end('this is about page');
        else if(req.url === '/contact'){
            res.write('This is contact page E-Mail=rohanbadhe2004@gmail.com')
            res.end();
        }
            else{
                res.end('page 404 not found')
            }

    });

    server.listen(3000,()=>{
        console.log('server running');
    });
