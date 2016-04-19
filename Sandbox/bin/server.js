var path=require('path');
var cluster=require('cluster');
var os=require('os');
var fs=require('fs');
var net=require('net');
var shelljs=require('shelljs');

var wrench=require('wrench');
var express=require("express");
var numCPUs = require('os').cpus().length;
var networkInterfaces = require('os').networkInterfaces( );

var IP=[];
for (var e in networkInterfaces) {
	IP.push(networkInterfaces[e][0].address);
};

var done=-1;

// check env
var check_env=-1;
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'var')) {
	fs.mkdirSync(__dirname+path.sep+'..'+path.sep+'var');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'registry')) {
	fs.mkdirSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'registry');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'packages')) {
	fs.mkdirSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'packages');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'installed')) {
	fs.mkdirSync(__dirname+path.sep+'..'+path.sep+'var'+path.sep+'installed');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'access.json')) {
	fs.writeFileSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'access.json','[\n\n]');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'hosts.json')) {
	fs.writeFileSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'hosts.json','[\n\n]');
	check_env=1;
};
if (!fs.existsSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'cluster.json')) {
	var cmd={
		"port"  	: 	"9191",
		"key" 		: 	"a6b3Efdq",
		"threads"	:	"1",
		"session"	: 	"mongodb://127.0.0.1/session"
	};
	fs.writeFileSync(__dirname+path.sep+'..'+path.sep+'config'+path.sep+'cluster.json',JSON.stringify(cmd,null,4));
	check_env=1;
};
if (check_env==1) return;
//
	
function encrypt(text){
	var crypto=require('crypto');
	var json=fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"cluster.json");
	var Config = JSON.parse(json);
	if (Config.key) {
	  var cipher = crypto.createCipher('aes-256-cbc',Config.key);
	  var crypted = cipher.update(text,'utf8','hex');
	  crypted += cipher.final('hex');
	  return crypted;
	} else return text;  
}
 
function testPort(port, host,pid, cb) {
  net.createConnection(port, host).on("connect", function(e) {
    cb("success", pid,e); 
  }).on("error", function(e) {
    cb("failure", pid,e);
  });
};

function getIPAddress() {
  var interfaces = require('os').networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];

    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
        return alias.address;
    }
  }

  return '0.0.0.0';
};

//CORS middleware
var allowCrossDomain = function(req, res, next) {
	var oneof = false;
	if(req.headers.origin) {
		res.header('Access-Control-Allow-Origin', req.headers.origin);
		oneof = true;
	}
	if(req.headers['access-control-request-method']) {
		res.header('Access-Control-Allow-Methods', req.headers['access-control-request-method']);
		oneof = true;
	}
	if(req.headers['access-control-request-headers']) {
		res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
		oneof = true;
	}
	if(oneof) {
		res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365);
	}

	// intercept OPTIONS method
	if (oneof && req.method == 'OPTIONS') {
		res.send(200);
	}
	else {
		next();
	}
};

function unregister_drone(sid,cb) {
    if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf"))

     SOCKETS=JSON.parse(fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf","utf-8"));
        else SOCKETS={};   
    if (SOCKETS[sid]) {
        var data=SOCKETS[sid];
        var dir=__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep;
        if (fs.existsSync(dir+data.drone+path.sep+data.host+path.sep+data.pid+'.pid')) fs.unlinkSync(dir+data.drone+path.sep+data.host+path.sep+data.pid+'.pid');
        delete SOCKETS[sid];
        fs.writeFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf",JSON.stringify(SOCKETS,null,4));      
        console.log("Removed "+sid);
        cb();
    } else cb();
};
function register_drone(sid,data,cb) {
		console.log(data);
		console.log(" - Register drone");
		var pid=__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry";
		var fs=require('fs');
		if (!fs.existsSync(pid+path.sep+data.drone)) fs.mkdirSync(pid+path.sep+data.drone); 
		pid=pid+path.sep+data.drone;
		if (!fs.existsSync(pid+path.sep+data.host)) fs.mkdirSync(pid+path.sep+data.host); 
		pid=pid+path.sep+data.host;
		fs.writeFileSync(pid+path.sep+data.pid+".pid",data.port);
		
		// add nginx config
		var response={
			"drone" : data.drone,
			"workers" : [],
			"worker" : {}
		};
		if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+data.drone))
		{
            if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf"))
            
             SOCKETS=JSON.parse(fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf","utf-8"));
                else SOCKETS={};
                SOCKETS[sid]=data; fs.writeFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+"sid.inf",JSON.stringify(SOCKETS,null,4));
			var glob=wrench.readdirSyncRecursive(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+data.drone);
			for (var i=0;i<glob.length;i++)
			{
				var unit=glob[i].split(path.sep);
				if (unit.length>1) {
					var port=fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+data.drone+path.sep+glob[i],'utf-8');
					if (response.workers.indexOf(unit[0])==-1) response.workers.push(unit[0]);
					if (!response.worker[unit[0]]) response.worker[unit[0]]= [];
					if (response.worker[unit[0]].indexOf(port)==-1) response.worker[unit[0]].push(port);
				}
			};
		};

		if (fs.existsSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"nginx.template")) {
			var tpl=fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"nginx.template",'utf-8');
			var hosts=[];
			for (var i=0;i<response.workers.length;i++) {
				var work=response.worker[response.workers[i]];
				for (var j=0;j<work.length;j++) {
					hosts.push('server '+response.workers[i]+':'+work[j]+';');
				};
			};
			hosts=hosts.join('\n\t');
			tpl=tpl.replace(/{HOSTS}/g,hosts);
			tpl=tpl.replace(/{URI}/g,data.uri);
			tpl=tpl.replace(/{NS}/g,data.drone);
			tpl=tpl.replace(/{PORT}/g,80);
			fs.writeFileSync('/etc/nginx/sites-enabled/'+path.sep+data.drone+'.conf',tpl);
			shelljs.exec("service nginx reload");
			console.log('done.');
            cb();
		} else {
			console.log('  ! nginx template not found');
			return;
		}
  
};

function doUploadPackage(ff,servers,ndx,cb)
{
	if (ndx<servers.length) {
		if (fs.existsSync(ff)) {
			console.log('Publishing package to worker '+servers[ndx]);
			if (servers[ndx].indexOf(':')==-1) servers[ndx]=servers[ndx]+':9090';
			var req = Request.post("http://"+servers[ndx]+"/upload", function (err, resp, body) {
			  if (err) {
				console.log('  ! Publishing failed. Check your config'.yellow);
				doUploadPackage(ff,servers,ndx+1,cb);
			  } else {
				console.log('  Done.');
				doUploadPackage(ff,servers,ndx+1,cb);
			  }
			});
			var form = req.form();
			form.append('file', fs.createReadStream(ff));
		} else {
			// on supprime le fichier
			done=true;
			if (fs.existsSync(ff)) require('fs').unlinkSync(ff);
			cb();
		}
	} else {
			// on supprime le fichier
			done=true;
			//if (fs.existsSync(ff)) require('fs').unlinkSync(ff);
			cb();	
	}
};


var json=fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"cluster.json");
var Config = JSON.parse(json);

if (Config.threads != "*") {
	numCPUs = Config.threads * 1;
};

if (cluster.isMaster) {
	console.log('');
	console.log(' Omneedia Cluster started at '+getIPAddress()+":"+Config.port+" ("+numCPUs+" threads)");	  
    require('shelljs').rm('-rf',__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry");
    fs.mkdirSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry");
    
    var workers = [];

    // Helper function for spawning worker at index 'i'.
    var spawn = function(i) {
        workers[i] = cluster.fork();
        workers[i].on('exit', function(worker, code, signal) {
            console.log('respawning worker', i);
            spawn(i);
        });
    };

    // Spawn workers.
    for (var i = 0; i < numCPUs; i++) {
        spawn(i);
    }

    var worker_index = function(ip, len) {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) {
            if (ip[i] !== '.') {
                s += ip[i];
            }
        };
        if (s.indexOf(':')>-1) s=s.substr(s.lastIndexOf(':')+1,255);
        return Number(s) % len;
    };

    var server = net.createServer({ pauseOnConnect: true }, function(connection) {
        var worker = workers[worker_index(connection.remoteAddress, numCPUs)];
        console.log(connection.remoteAddress);
        worker.send('sticky-session:connection', connection);
    }).listen(Config.port);
    
} else {
    
   
    console.log("- thread started.");	
	var app = express();
    var server = app.listen(0, getIPAddress());
    
	//var http = require('http').createServer(app);

	var io = require('socket.io')(server);

    // Socket Sessions use mongodb
    var reg_session = 'mongodb://'+getIPAddress()+':27017/cluster';
    var mongo=require('socket.io-adapter-mongo');
    io.adapter(mongo({uri:reg_session}));    
        
    io.on('connection', function(socket){
        console.log('- Client '+socket.id+' connected.');
        socket.on('ONLINE',function(data){
            register_drone(socket.id,data,function(){
                socket.emit("REGISTER","OK");
            });
        });
        socket.on('disconnect',function(){
            unregister_drone(socket.id,function(){
                console.log("Disconnected.");    
            }); 
        });
    });

	if (Config.proxy) var Request=request.defaults({'proxy':Config.proxy}); else var Request=require('request');
	app.use(require('morgan')("dev"));
	app.use(require('cookie-parser')());
	app.use(require('body-parser').urlencoded({
		extended: true,
		limit: "5000mb"
	}));
	app.use(require('body-parser').json({
		limit: "5000mb"
	}));

	var multer=require('multer');
	
    var storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, __dirname+require('path').sep+'..'+require('path').sep+'var'+require('path').sep+'packages')
      },
      filename: function (req, file, cb) {
        cb(null, file.originalname)
      }
    })

    var UPLOAD = multer({ storage: storage })    
    
	app.post('/upload',UPLOAD.single("file"),function(req,res,next){
		// Are you in my access list ?
		var ips=JSON.parse(fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"access.json"));
		var ip=req.ip;
		if (ip.indexOf(':')>-1) ip=ip.substr(ip.lastIndexOf(':')+1,255);
		if (ips.indexOf(ip)==-1) res.sendStatus(403);
		else {
			if(req.file){
                var servers=JSON.parse(require('fs').readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"hosts.json",'utf-8'));
                doUploadPackage(req.file.path,servers,0,function() {
                    done=true;
                    res.end("File uploaded.");
                    console.log('Done.');
                });			
			}
		};
	});

	app.use(allowCrossDomain);
	app.enable('trust proxy');
	
	app.post('/session',function(req,res) {
		var ips=JSON.parse(fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"access.json"));
		console.log('-->');
		var ip=req.ip;
		if (ip.indexOf(':')>-1) ip=ip.substr(ip.lastIndexOf(':')+1,255);
		console.log(ip);
		if (ips.indexOf(ip)>-1) { 
			var json=fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"cluster.json");
			var Config = JSON.parse(json);
			res.end(encrypt(Config.session));
		} else res.sendStatus(403);		
	});

	app.post('/stop',function(req,res) {
		var ips=JSON.parse(fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"access.json"));
		console.log('-->');
		var ip=req.ip;
		if (ip.indexOf(':')>-1) ip=ip.substr(ip.lastIndexOf(':')+1,255);
		console.log(ip);
		if (ips.indexOf(ip)>-1) { 
			console.log(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.ns+path.sep+ip);
			if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.ns+path.sep+ip)) {
				require('shelljs').rm('-rf',__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.ns+path.sep+ip);
				res.end('OK');
			} else res.sendStatus(404);
		} else res.sendStatus(403);		
	});
		
	app.get('/:drone',function(req,res) {
		var response={
			"omneedia" : {
				"version" : "1.0.0",
				"engine"  : "cluster"
			},
			"drone" : req.query.drone,
			"workers" : [],
			"worker" : {}
		};
		if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.query.drone))
		{
			var glob=wrench.readdirSyncRecursive(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.query.drone);
			for (var i=0;i<glob.length;i++)
			{
				var unit=glob[i].split(path.sep);
				if (unit.length>1) {
					var port=fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.query.drone+path.sep+glob[i],'utf-8');
					if (response.workers.indexOf(unit[0])==-1) response.workers.push(unit[0]);
					if (!response.worker[unit[0]]) response.worker[unit[0]]= [];
					if (response.worker[unit[0]].indexOf(port)==-1) response.worker[unit[0]].push(port);
				}
			};
		};
		res.writeHead(200, {'Content-Type' : 'application/json','charset' : 'utf-8'});
		res.end(JSON.stringify(response,null,4));
		
		return;
	
	});
	app.get('/',function(req,res) {
		var response={
			"omneedia" : {
				"version" : "1.0.0",
				"engine"  : "cluster"
			},
			"drones" : [],
			"drone" : {}
		};
		var glob=wrench.readdirSyncRecursive(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry");
		for (var i=0;i<glob.length;i++)
		{
			var unit=glob[i].split(path.sep);
			if (unit.length>2) {
				if (response.drones.indexOf(unit[0])==-1) response.drones.push(unit[0]);
				var port=fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+glob[i],'utf-8');
				if (!response.drone[unit[0]]) {
					response.drone[unit[0]]= {
						workers : [],
						worker : {}
					};
				};
				if (response.drone[unit[0]].workers.indexOf(unit[1])==-1) response.drone[unit[0]].workers.push(unit[1]);
				if (!response.drone[unit[0]].worker[unit[1]]) response.drone[unit[0]].worker[unit[1]]= [];
				var tmp=glob[i].split('.pid')[0]+':'+port;
				tmp=tmp.substr(tmp.lastIndexOf(require('path').sep)+1,tmp.length);
				if (response.drone[unit[0]].worker[unit[1]].indexOf(port)==-1) response.drone[unit[0]].worker[unit[1]].push(tmp);
			}
		};
		res.writeHead(200, {'Content-Type' : 'application/json','charset' : 'utf-8'});
		res.end(JSON.stringify(response,null,4));
		
		return;
	});
	app.get('/api',function(req,res) {
		res.end("Omneedia Cluster API\nversion 1.0.0");
		return;
	});
	app.delete('/api',function(req,res) {
		var pid=__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry";
		if (!fs.existsSync(pid+path.sep+req.query.drone)) fs.mkdirSync(pid+path.sep+req.query.drone); 
		pid=pid+path.sep+req.query.drone;
		if (!fs.existsSync(pid+path.sep+req.query.host)) fs.mkdirSync(pid+path.sep+req.query.host); 
		pid=pid+path.sep+req.query.host+path.sep+req.query.pid+".pid";		
		if (fs.existsSync(pid)) {
			fs.unlink(pid);
			res.end('done.');
			console.log(pid+' FOUND');
		} else {
			res.end("pid not found.");
			console.log(pid+' pid not found');
		}
	});
	app.post('/api',UPLOAD.single(),function(req,res,next) {
		console.log(req.body);
		console.log("*------>API");
		var pid=__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry";
		var fs=require('fs');
		if (!fs.existsSync(pid+path.sep+req.body.drone)) fs.mkdirSync(pid+path.sep+req.body.drone); 
		pid=pid+path.sep+req.body.drone;
		if (!fs.existsSync(pid+path.sep+req.body.host)) fs.mkdirSync(pid+path.sep+req.body.host); 
		pid=pid+path.sep+req.body.host;
		fs.writeFileSync(pid+path.sep+req.body.pid+".pid",req.body.port);
		
		// add nginx config
		var response={
			"drone" : req.body.drone,
			"workers" : [],
			"worker" : {}
		};
		if (fs.existsSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.drone))
		{
			var glob=wrench.readdirSyncRecursive(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.drone);
			for (var i=0;i<glob.length;i++)
			{
				var unit=glob[i].split(path.sep);
				if (unit.length>1) {
					var port=fs.readFileSync(__dirname+path.sep+".."+path.sep+"var"+path.sep+"registry"+path.sep+req.body.drone+path.sep+glob[i],'utf-8');
					if (response.workers.indexOf(unit[0])==-1) response.workers.push(unit[0]);
					if (!response.worker[unit[0]]) response.worker[unit[0]]= [];
					if (response.worker[unit[0]].indexOf(port)==-1) response.worker[unit[0]].push(port);
				}
			};
		};

		if (fs.existsSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"nginx.template")) {
			var tpl=fs.readFileSync(__dirname+path.sep+".."+path.sep+"config"+path.sep+"nginx.template",'utf-8');
			var hosts=[];
			for (var i=0;i<response.workers.length;i++) {
				var work=response.worker[response.workers[i]];
				for (var j=0;j<work.length;j++) {
					hosts.push('server '+response.workers[i]+':'+work[j]+';');
				};
			};
			hosts=hosts.join('\n\t');
			tpl=tpl.replace(/{HOSTS}/g,hosts);
			tpl=tpl.replace(/{URI}/g,req.body.uri);
			tpl=tpl.replace(/{NS}/g,req.body.drone);
			tpl=tpl.replace(/{PORT}/g,80);
			fs.writeFileSync('/etc/nginx/sites-enabled/'+path.sep+req.body.drone+'.conf',tpl);
			shelljs.exec("service nginx reload");
			res.end('done.');
		} else {
			console.log('  ! nginx template not found');
			return;
		}
	});
    process.on('message', function(message, connection) {
        if (message !== 'sticky-session:connection') {
            return;
        }

        // Emulate a connection event on the server by emitting the
        // event with the connection the master sent us.
        server.emit('connection', connection);

        connection.resume();
    });

};