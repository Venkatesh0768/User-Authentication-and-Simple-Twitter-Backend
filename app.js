const express = require("express");
const app = express();
const path = require("path");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const upload = require("./config/multerconfig");



const userModel = require("./models/user");
const postModel = require("./models/post");
const user = require("./models/user");
const post = require("./models/post");


app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());


app.get("/", (req, res) => {
  res.render("index");
});

app.get("/delete/:id", async (req, res) => {
  let post  =  await postModel.findOneAndDelete({_id: req.params.id})
  res.redirect("/profile");
})

app.get("/profile", isLoggedIn, async (req, res) => {
  let user  =  await userModel.findOne({email: req.user.email}).populate("posts")
  res.render("profile", { user});
});  

app.get("/profile/upload", (req, res) => {
    res.render("upload")
});

app.post("/upload", isLoggedIn,upload.single("image"), async (req, res) => {
  let user  =  await userModel.findOne({email: req.user.email})
  user.profilepic = req.file.filename
  user.save()
  res.redirect("/profile");

}); 


app.get("/edit/:id", isLoggedIn, async (req, res) => {
  let post  =  await postModel.findOne({_id: req.params.id})
  res.render("edit" ,{post});
}); 

app.post("/update/:id", isLoggedIn, async (req, res) => {
  let post  =  await postModel.findOneAndUpdate({_id: req.params.id} ,{content : req.body.content})
  res.redirect("/profile");
}); 

app.get("/like/:id", isLoggedIn, async (req, res) => {
  let post  =  await postModel.findOne({_id: req.params.id}).populate("user")

  if(post.likes.indexOf(req.user.userid) == -1){
    post.likes.push(req.user.userid);
  }else{
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect("/profile");
}); 

app.post("/post", isLoggedIn ,async (req, res) => {
  let user = await userModel.findOne({email: req.user.email})
  let {content} = req.body
  let post =   await postModel.create({ 
    user : user._id,
    content
  })

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

app.post("/register" ,async (req, res) => {
  let { name, username, password, email, age } = req.body;
  let user = await userModel.findOne({ email: email, password: password });
  if (user) return res.status(200).send("Not found");

  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let user = await userModel.create({
        name,
        username,
        email,
        password: hash,
        age,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "venky");
      res.cookie("token", token);
      res.redirect("/profile");
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});


app.post("/login", async (req, res) => {
   let { email, password } = req.body;
 
   try {
     let user = await userModel.findOne({ email });
 
     // If no user found, send error response
     if (!user) {
       return res.status(401).send("Invalid email or password");
     }
 
     // Compare the provided password with the hashed password
     bcrypt.compare(password, user.password, (err, result) => {
       if (err) {
         return res.status(500).send("Error in password comparison");
       }
 
       // If password matches, generate JWT token
       if (result) {
         let token = jwt.sign({ email: email, userid: user._id }, "venky"); // Token expires in 1 hour
         res.cookie("token", token);
         res.redirect("/profile");
       } else {
         // If password does not match, send error response
         res.status(401).send("Invalid email or password");
       }
     });
   } catch (err) {
     res.status(500).send("Server error");
   }
 });
 
app.get("/logout", async (req, res) => {
  res.cookie("token", "");
  res.redirect("/login");
});

app.get("/profile", isLoggedIn, (req, res) => {
   console.log(req.user); // Logs the user data attached by `isLoggedIn`
   res.send(`Welcome to your profile, ${req.user.email}`);
 });

function isLoggedIn(req, res, next){
   const token = req.cookies.token; 
   if (!token) {
     return res.status(401).send("Access denied. Please log in.");
   }
 
   try {
     const decoded = jwt.verify(token, "venky"); 
     req.user = decoded;
     next();
   } catch (err) {
     res.status(401).send("Invalid or expired token. Please log in again.");
   }
 };
 

app.listen(3000);
