import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;


app.use(cors({
	origin: process.env.CORS_ORIGIN,
	credentials: true,
}))

app.use(session(
	{
		secret: process.env.SESSION_SECRET || "fallback-secret-session-akkljfk",
		resave: false,
		saveUninitialized: true,
		cookie: {
			secure: process.env.NODE_ENV === 'production'
		}
	}

))
app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy(
	{
		clientID: process.env.GOOGLE_CLIENT_ID,
		clientSecret: process.env.GOOGLE_CLIENT_SECRET,
		callbackURL: `http://localhost:${port}/login/google/callback`
	},
	function (accessToken, refreshToken, profile, done) {

		return done(null, profile);
	}
))

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});


app.use(express.json());
app.use(express.urlencoded({ 
	extended: true,
	limit: '16kb'
}));

app.use(express.static("public"));
app.use(cookieParser());


app.get('/', (req, res) => {
	res.send(`
        <h1>Home Page</h1>
        <a href="/login/google">Login with Google</a>
    `);
});

app.get('/login/google', 
	passport.authenticate('google', {
		scope: [
			'openid',
			'profile',
			'email',
			'https://www.googleapis.com/auth/calendar.events'
		]
	})
);

app.get('/login/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {

    res.redirect('/profile');
  }
);

app.get('/profile', (req, res) => {
	if (!req.isAuthenticated()) {
		return res.redirect('/');
	}
	console.log('User profile:', req?.user);

	res.send(`
        <h1>Profile Page</h1>
        <p>Welcome, <strong>${req.user.displayName}</strong>!</p>
        <p>Email: ${req.user.emails[0].value}</p>
		<img src="${req.user.photos[0].value}" alt="Profile Picture" width="100" height="100">
        <br><br>
        <a href="/logout">Logout</a>
    `);
});

app.get('/logout', (req, res, next) => {
    
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});


app.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
