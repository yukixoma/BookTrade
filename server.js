var express = require("express");
var app     = express();

var bodyParser = require("body-parser");

var server  = app.listen(process.env.PORT || 3000);
var io      = require("socket.io")(server);

var mongoose    = require("mongoose");
var user        = require("./model/user.js");
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost/user", {
    useMongoClient: true
});

var auth = false;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set("views","./views");
app.set("view engine","ejs");


require('events').EventEmitter.defaultMaxListeners = 100;
io.on("connection", function(socket){
    socket.on("add",function(data){
        user.findOne({username: data.username},function(err,result){
            if(err) throw err;
            if(result) {
                result.book.push({name: data.name, cover: data.cover});
                user.findByIdAndRemove(result._id,function(err){
                    if(err) throw err;
                    var newUser = new user({
                        username: result.username,
                        password: result.password,
                        info: result.info,
                        book: result.book,
                        trade: result.trade,
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        console.log("book updated");
                        socket.emit("update", newUser.book);
                        return;
                    })
                })
            }
        })
    })
    socket.on("remove",function(data){
        user.findOne({username: data.username}, function(err,result){
            if(err) throw err;
            if(result) {
                for( var i = 0; i <result.book.length; i ++) {
                    if( data.name == result.book[i].name) result.book.splice(i,1);
                }
                user.findByIdAndRemove(result._id,function(err){
                    if(err) throw err;
                    console.log("book deleted");
                    var newUser = new user ({
                        username: result.username,
                        password: result.password,
                        info: result.info,
                        book: result.book,
                        trade: result.trade,
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        socket.emit("update",newUser.book);
                        return;
                    })
                })
            }
        })
    })
    socket.on("trade",function(data){
        user.findOne({username: data.username}, function(err,result){
            if(err) throw err;
            if(result) {
                for( var i = 0; i <result.book.length; i ++) {
                    if( data.name == result.book[i].name) {
                        result.trade.push(result.book[i]);
                        result.book.splice(i,1);
                    }
                }
                user.findByIdAndRemove(result._id,function(err){
                    if(err) throw err;
                    console.log("book deleted");
                    var newUser = new user ({
                        username: result.username,
                        password: result.password,
                        info: result.info,
                        book: result.book,
                        trade: result.trade,
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        socket.emit("trade", newUser.trade);
                        socket.emit("update", newUser.book);
                        user.find({}, function(err,data){
                            if(err) throw err;
                            if(data.length>0) {
                                var noti = [];
                                for(var i = 0; i < data.length; i++) {
                                    if(data[i].trade.length>0) {
                                        noti.push({username: data[i].username, trade: data[i].trade})
                                    }
                                }
                                socket.broadcast.emit("noti",noti);
                                return;                        
                            }
                        })
                    })
                })
            }
        })
    })
    socket.on("rmtrade", function(data){
        user.findOne({username: data.username}, function(err,result){
            if(err) throw err;
            if(result) {
                for( var i = 0; i <result.trade.length; i++) {
                    if(data.name == result.trade[i].name) {
                        result.book.push(result.trade[i]);
                        result.trade.splice(i,1);
                    }
                }
                user.findByIdAndRemove(result._id,function(err){
                    if(err) throw err;
                    var newUser = new user ({
                        username: result.username,
                        password: result.password,
                        info: result.info,
                        book: result.book,
                        trade: result.trade,
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        console.log("trade updated");
                        socket.emit("trade", newUser.trade);
                        socket.emit("update", newUser.book);
                        user.find({}, function(err,data){
                            if(err) throw err;
                            if(data.length>0) {
                                var noti = [];
                                for(var i = 0; i < data.length; i++) {
                                    if(data[i].trade.length>0) {
                                        noti.push({username: data[i].username, trade: data[i].trade})
                                    }
                                }
                                socket.broadcast.emit("noti",noti); 
                                return;                       
                            }
                        })
                    })
                })
                
            }
        })
    })
    socket.on("accept",function(data){
        var temp = [];
        user.findOne({username: data.offer},function(err,result){
            if(err) throw err;
            for (var i = 0; i < result.trade.length; i++) {
                if (result.trade[i].name == data.name) {
                    temp.push(result.trade[i]);
                    result.trade.splice(i,1);
                }
            }
            user.findByIdAndRemove(result._id,function(err){
                if(err) throw err;
                var newUser = new user ({
                    username: result.username,
                    password: result.password,
                    info: result.info,
                    book: result.book,
                    trade: result.trade,
                })
                newUser.save(function(err){
                    if(err) throw err;
                    console.log("offer trade updated");
                    next();
                })
            })

        })
        function next () {
            user.findOne({username: data.username},function(err,Result){
                if(err) throw err;
                Result.book.push(temp[0]);
                user.find({username: username}).remove(function(err){
                    if(err) throw err;
                    var newUser = new user ({
                        username: Result.username,
                        password: Result.password,
                        info: Result.info,
                        book: Result.book,
                        trade: Result.trade,
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        console.log("accept user book updated");
                        update();
                    })
                })
            })
        }
        function update () {
            user.find({}, function(err,result){
                if(err) throw err;
                if(result.length>0) {
                    var noti = [];
                    for(var i = 0; i < result.length; i++) {
                        if(result[i].trade.length>0) {
                            noti.push({username: result[i].username, trade: result[i].trade})
                        }
                    }
                    io.sockets.emit("noti",noti);
                    return;                        
                }
            })
            user.findOne({username: data.username},function(err,result) {
                if(err) throw err;
                socket.emit("update",result.book);
                return;
            })
            user.findOne({username: data.offer},function(err,result){
                if(err)  throw err;
                socket.broadcast.emit("trade",{username: data.offer, trade: result.trade})
                return;
            })
        }
    })
})

app.get("/",function(req,res){
    auth = false;
    res.render("index");
    io.on("connection",function(socket){
        user.find({},function(err,data){
            if(err) throw err;
            var allBook = [];
            for( var i = 0; i < data.length; i++){
                data[i].book.forEach(function(e) {
                    allBook.push(e);
                });
                data[i].trade.forEach(function(e){
                    allBook.push(e);
                })
            }
            socket.emit("allBook",allBook);
        })
        socket.on("signup", function(data){
            user.findOne({username: data.username},function(err, result){
                if(err) throw err;
                if(result) socket.emit("signup","Username already used");
                else {
                    var newUser = new user ({
                        username: data.username,
                        password: data.password,
                        info: {},
                        book: [],
                        trade: []
                    })
                    newUser.save(function(err){
                        if(err) throw err;
                        socket.emit("signup","Welcome " + data.username);
                    })
                }
            })
        })
        socket.on("login", function(data){
            user.findOne({username: data.username, password: data.password}, function(err,result){
                if(err) throw err;
                if(result) {
                    auth = true;
                    socket.emit("login","/user/" + data.username);
                    return;
                }
                else {
                    socket.emit("login","Invalid username or password");
                    return;
                }
            })
        })
        socket.on("logout", function(data){
            auth = false;
        })
    })
    
})
app.get("/user/:username",function(req,res){
    var username = req.params.username;
    if(auth) {
        auth = false;
        res.render("user");
        user.findOne({username:username},function(err,data){
            if(err) throw err;
            if(data) {
                io.on("connection",function(socket){
                    socket.emit("update",data.book);
                    socket.emit("trade", data.trade);
                })
            }
        })
        user.find({username: { $ne: username}}, function(err,data){
            if(err) throw err;
            if(data.length>0) {
                var noti = [];
                for(var i = 0; i < data.length; i++) {
                    if(data[i].trade.length>0) {
                        noti.push({username: data[i].username, trade: data[i].trade})
                    }
                }
                io.on("connection", function(socket){
                    socket.emit("noti",noti);
                })
                
            }
        })
    }
    else res.redirect("/");
    
})

app.get("/update",function(req,res){
    var username ="";
    res.render("update");

    io.on("connection",function(socket){
       socket.on("infoLogin",function(data){
            user.findOne({username: data.username, password: data.password},function(err,result){
                if(err) throw err;
                if(result) {
                    username = data.username;
                    socket.emit("infoLogin", result.info);
                }
                else {
                    username = "";
                    socket.emit("infoLogin","fail");
                }
            })
       })
       socket.on("submit",function(data){
           user.findOne({username: username},function(err,result){
               if(err) throw err;
               if(result) {
                   result.info = data;
                   user.findByIdAndRemove(result._id,function(err){
                       if(err) throw err;
                       var newUser = new user ({
                            username: result.username,
                            password: result.password,
                            info: result.info,
                            book: result.book,
                            trade: result.trade,
                       })
                       newUser.save(function(err){
                           if(err) throw err;
                           console.log("info updated");
                           socket.emit("submit","success");
                       })
                   })
                } else socket.emit("submit","fail");
           })
       })
   })
})