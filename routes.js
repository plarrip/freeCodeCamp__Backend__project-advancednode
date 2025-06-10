const passport = require('passport');
const bcrypt = require('bcrypt');


module.exports = function (app, myDataBase){

    //middleware to ensure connection to MongoDB before rendering '/profile' page
    function ensureAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
        return next();
        }
        res.redirect('/');
    };

    app.route('/').get((req, res) => {
        // Change the response to render the Pug template (login page)
        res.render('index', {
        title: 'Connected to Database',
        message: 'Please login',
        showLogin: true,
        showRegistration: true,
        showSocialAuth: true
        });
    });

    // LOGIN ROUTE - POST request with passport authentication ('local' strategy)
    app.route('/login')
        .post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
        res.redirect('/chat');
        });

    // PROFILE ROUTE - Render profile page
    app.route('/profile')
        .get(ensureAuthenticated, (req, res) => {
        res.render('profile', { username: req.user.username });
        });

    
    // LOGOUT route
    app.route('/logout')
        .get((req, res) => {
        req.logout();
        res.redirect('/');
    });

    app.route('/register')
    .post((req, res, next) => {
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
            next(err);
        } else if (user) {
            res.redirect('/');
        } else {
            myDataBase.insertOne({
            username: req.body.username,
            password: hash
            },
            (err, doc) => {
                if (err) {
                res.redirect('/');
                } else {
                // The inserted document is held within
                // the ops property of the doc
                next(null, doc.ops[0]);
                }
            }
            )
        }
        })
    },
        passport.authenticate('local', { failureRedirect: '/' }),
        (req, res, next) => {
        res.redirect('/chat');
        }
    );

    app.route('/auth/github')
        .get(passport.authenticate('github'));

    app.route('/auth/github/callback')
        .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
            req.session.user_id = req.user.id;
            res.redirect('/chat');
        }
    );

    app.route('/chat')
        .get(ensureAuthenticated, (req, res) => {
            res.render('chat', { user: req.user })
        });

    // Handling missing pages (Error 404)
    app.use((req, res, next) => {
        res.status(404)
        .type('text')
        .send('Not Found');
    });

}