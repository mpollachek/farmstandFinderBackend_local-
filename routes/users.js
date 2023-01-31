var express = require("express");
const User = require("../models/user");
const Farm = require("../models/farmSchema");
const passport = require("passport");
const authenticate = require("../authenticate");
const cors = require("./cors");

const userRouter = express.Router();

/* GET users listing. */
userRouter
  .route("/")
  .get(
    cors.corsWithOptions,
    authenticate.verifyUser,
    authenticate.verifyAdmin,
    (req, res, next) => {
      User.find()
        .then((users) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(users);
        })
        .catch((err) => next(err));
    }
  );

userRouter
  .route("/signup")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .post(cors.corsWithOptions, (req, res) => {
    User.register(
      new User({ username: req.body.username }),
      req.body.password,
      (err, user) => {
        if (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.json({ err: err });
        } else {
          if (req.body.useremail) {
            user.useremail = req.body.useremail;
          }
          user.save((err) => {
            if (err) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.json({ err: err });
              return;
            }
            passport.authenticate("local")(req, res, () => {
              console.log("req.user: ", req.user);
              const token = authenticate.getToken({ _id: req.user._id });
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.json({
                success: true,
                token: token,
                userId: req.user._id,
                userName: req.user.username,
                status: "Registration Successful!",
              });
            });
          });
        }
      }
    );
  });

// userRouter.post('/login', cors.corsWithOptions, passport.authenticate('local', {session: false}), (req, res) => {
//   console.log("1")
//   const token = authenticate.getToken({_id: req.user._id});
//   console.log("1")
//   res.statusCode = 200;
//   res.setHeader('Content-Type', 'application/json');
//   res.json({success: true, token: token, status: 'You are successfully logged in!'});
// });

userRouter
  .route("/login")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .post(cors.corsWithOptions, passport.authenticate("local"), (req, res) => {
    const token = authenticate.getToken({ _id: req.user._id });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.json({
      success: true,
      token: token,
      userId: req.user._id,
      userName: req.user.username,
      status: "You are successfully logged in!",
    });
  });

userRouter.get("/logout", cors.corsWithOptions, (req, res, next) => {
  if (req.session) {
    req.session.destroy();
    res.clearCookie("session-id");
    res.redirect("/");
  } else {
    const err = new Error("You are not logged in!");
    err.status = 401;
    return next(err);
  }
});

userRouter.get(
  "/facebook/token",
  passport.authenticate("facebook-token"),
  (req, res) => {
    if (req.user) {
      const token = authenticate.getToken({ _id: req.user._id });
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.json({
        success: true,
        token: token,
        status: "You are successfully logged in!",
      });
    }
  }
);

userRouter
  .route("/protected")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    if (req.isAuthenticated()) {
      res.send(req.user);
      console.log("Protected");
    } else {
      res.status(401).send({ msg: "Unauthorized" });
    }
    //console.log("session:", req.session);
    //console.log("user", req.user);
  });

userRouter
  .route("/favorites")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    console.log("req.query: ", req.query);
    if (req.isAuthenticated()) {
      console.log("userId: ", req.user.id);
      User.findById(req.user.id)
        .then((user) => {
          console.log("user: ", user);
          console.log("favorite array: ", user.favorite);
          Farm.find({
            _id: { $in: user.favorite },
          })
          .populate({
            path: "comments",
            select: "rating"
          })
          .then((farms) => {
            console.log("farms: ", farms);
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(farms);
          });
        })
        .catch((err) => next(err));
    }
  });

  userRouter
  .route("/favoritesIdList")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    console.log("req.query: ", req.query);
    if (req.isAuthenticated()) {
      console.log("userId: ", req.user.id);
      User.findById(req.user.id)
        .then((user) => {
          console.log("user: ", user);
          console.log("favorite array: ", user.favorite);
          res.json(user.favorite);
        })
        .catch((err) => next(err));
    }
  });

userRouter
  .route("/isfavorite/:farmstandId")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    console.log("req.query: ", req.query);
    const farmstandId = req.params.farmstandId;
    if (req.isAuthenticated()) {
      console.log("userId: ", req.user.id);
      User.findById(req.user.id)
        .then((user) => {
          console.log("user: ", user);
          console.log("farmstandId: ", farmstandId);
          if (user.favorite.includes(farmstandId)) {
            let isFavorite = true;
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(isFavorite);
            console.log("isFavorite: ", isFavorite);
          } else {
            let isFavorite = false;
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.json(isFavorite);
            console.log("isFavorite: ", isFavorite);
          }
        })
        .catch((err) => next(err));
    }
  })
  .put(cors.cors, authenticate.verifyUser, (req, res, next) => {
    const farmstandId = req.params.farmstandId;
    if (req.isAuthenticated()) {
      User.findById(req.user.id)
        .then(async (user) => {
          const favoritesArray = user.favorite;
          if (favoritesArray.includes(farmstandId)) {
            console.log("user favorites: ", favoritesArray);
            const index = favoritesArray.indexOf(farmstandId);
            console.log("index: ", index);
            favoritesArray.splice(index, 1);
            console.log("fav array after splice: ", favoritesArray);
            await user.updateOne({ favorite: favoritesArray });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end("removed from favorites");
          } else {
            favoritesArray.push(farmstandId);
            await user.updateOne({ favorite: favoritesArray });
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(`added ${farmstandId} to favorites`);
          }
        })
        .catch((err) => next(err));
    }
  });

  userRouter
  .route("/owned")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    console.log("req.query: ", req.query);
    if (req.isAuthenticated()) {
      console.log("userId: ", req.user.id);
      User.findById(req.user.id)
        .then((user) => {
          console.log("user: ", user);
          console.log("owned array: ", user.owner);
          res.json(user.owner);
        })
        .catch((err) => next(err));
    }
  })

  userRouter.route("/owned/:farmstandId")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    const farmstandId = req.params.farmstandId;
    console.log("farmstandId: ", farmstandId)
    if (req.isAuthenticated()) {
      User.findById(req.user.id)
        .then(async (user) => {
          console.log("user", user)
          const ownerArray = user.owner;
          const farmOwner = await Farm.findById(farmstandId);
          console.log("farmOwner: ", farmOwner)
          const farmOwnerArray = farmOwner.owner;
          console.log("farmOwnerArray: ", farmOwnerArray)
          try {
          if (ownerArray.includes(farmstandId)) {
            console.log("user owned: ", ownerArray);
            const index = ownerArray.indexOf(farmstandId);
            console.log("index: ", index);
            ownerArray.splice(index, 1);
            console.log("owner array after splice: ", ownerArray);
            await user.updateOne({ owner: ownerArray });            
            const indexFarmOwner = farmOwnerArray.indexOf(req.user.id)
            farmOwnerArray.splice(indexFarmOwner, 1);
            await farmOwner.updateOne({ owner: farmOwnerArray })
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end("removed from owned");
          } else {
            console.log("owner array before push: ", ownerArray)
            console.log("farmstandId: ", farmstandId)
            console.log("user.owner: ", user.owner)
            ownerArray.push(farmstandId);
            console.log("owner array after push: ", ownerArray)
            await user.updateOne({ owner: ownerArray });
            console.log("user.owner after update: ", user.owner)
            farmOwnerArray.push(req.user.id);
            await farmOwner.updateOne({owner: farmOwnerArray})
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(`added ${farmstandId} to owner`);
          }
        } catch(err) {console.log("error: ", err)};
        })
        .catch((err) => next(err));
    }
  });

userRouter
  .route("/test")
  .options(cors.corsWithOptions, (req, res) => res.sendStatus(200))
  .get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    User.find()
      .then((users) => {
        console.log("users: ", users);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json(users);
      })
      .catch((err) => next(err));
  });

module.exports = userRouter;
