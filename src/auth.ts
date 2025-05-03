import {Request, Response, NextFunction, Express, Router} from 'express';
import passport from 'passport';
import * as openidClient from 'openid-client'
import {
    Strategy,
    type VerifyFunction,
    type StrategyOptions, StrategyOptionsWithRequest,
} from 'openid-client/passport'
import {env} from './env';
import csrf from "@dr.pogodin/csurf";
import PersistanceAdapter from "./persistance_adapter";

export interface Claim {
    access_token: string;
    id_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
    me: any;
    updated_at: number;
}

export const claims = new PersistanceAdapter<Claim>('claims');

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // @ts-ignore
    req.session.destination_path = req.originalUrl;
    res.redirect('/login') // if not auth
};

passport.serializeUser((user, cb) => {
    cb(null, user)
})

passport.deserializeUser((user: Express.User, cb) => {
    // console.log("deserializeUser: ", user);
    return cb(null, user)
})

const login = passport.authenticate('nbn', {
    failureRedirect: '/login',
    failureFlash: true,
    keepSessionInfo: true
});

const logout = (req: Request, res: Response, next: NextFunction) => {
    try {
        req.logout(() => {
            res.redirect(
                openidClient.buildEndSessionUrl(issuer, {
                    post_logout_redirect_uri: `https://${config.HOSTNAME}`,
                }).href,
            )
        })
    } catch (error) {
        next(error);
    }
};

const callback = (req: Request, res: Response, next: NextFunction) => {
    // Executed on successful login
    // console.log("Callback URL triggered");
    // console.log("req", req);
    // console.log("req.params", req.session);
    // console.log("req.user", req.user);
    res.redirect('/');
};

const me = (req: Request, res: Response, next: NextFunction) => {
    // console.log("req: ", req.user);
    res.send(req.user);
};

const router = Router();

router.get('/login', login);
router.get('/callback',
    passport.authenticate('nbn', {
        failureRedirect: '/login',
        failureFlash: true,
        keepSessionInfo: true
    }), callback);
router.get('/logout', logout);
router.get('/me', ensureAuthenticated, me);

export const setup = async (app: Express) => {
    const provider_url = new URL(env.OIDC_PROVIDER_URL);

    const issuer = await openidClient.discovery(
        provider_url,
        env.OIDC_CLIENT_ID,
        env.OIDC_CLIENT_SECRET,
    );

    console.log('Discovered issuer:', issuer.serverMetadata());

    let options: StrategyOptionsWithRequest = {
        config: issuer,
        scope: 'openid profile email phone address',
        callbackURL: `https://${env.HOSTNAME}/callback`,
        passReqToCallback: true
    }

    passport.use('nbn', new Strategy(options,
        async (req, tokens, verified) => {
            // console.log('userinfo', userinfo);
            const this_claim = tokens.claims();
            if (this_claim == undefined) {
                return;
            }

            const me = await openidClient.fetchUserInfo(issuer, tokens.access_token, this_claim.sub);
            console.log("openidClient.fetchUserInfo: ", me);

            const claim = {
                access_token: tokens.access_token,
                id_token: tokens.id_token,
                token_type: tokens.token_type,
                scope: tokens.scope,
                expires_in: tokens.expires_in,
                refresh_token: tokens.refresh_token,
                me: me,
                updated_at: Date.now()
            }

            await claims.upsert(this_claim.sub, claim);

            verified(null, claim);
        }
    ));

// Initialize CSRF protection
    const csrfProtection = csrf({
        cookie: true,
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'PATCH' ],
    });

// Make CSRF token available to all templates
    app.use((req, res, next) => {
        // Explicit collection of paths to skip CSRF protection
        if(
            req.path.startsWith('/callback')
        ) {
            // @ts-ignore
            req.csrfToken = () => '';
            next();
        } else {
            csrfProtection(req, res, next);
        }
    });

// Make CSRF token available to all views
    app.use((req, res, next) => {
        // @ts-ignore
        res.locals.csrfToken = req.csrfToken();
        next();
    });

    app.use('/', router);
}