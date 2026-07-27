const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=process.cwd();
const MIME={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split('?')[0]);
  if(u==='/')u='/index.html';
  let p=path.join(ROOT,u);
  if(!p.startsWith(ROOT)){res.writeHead(403);res.end();return;}
  fs.stat(p,(e,s)=>{
    if(e||s.isDirectory()){p=path.join(ROOT,'index.html');}
    fs.readFile(p,(e2,b)=>{
      if(e2){res.writeHead(404);res.end();return;}
      const ext=path.extname(p).toLowerCase();
      res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
      res.end(b);
    });
  });
}).listen(8080,()=>console.log('listening 8080'));