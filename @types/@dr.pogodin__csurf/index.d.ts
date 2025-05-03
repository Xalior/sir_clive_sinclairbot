declare module '@dr.pogodin/csurf' {
  import { RequestHandler } from 'express';

  interface CsurfOptions {
    /** Value indicating if the csrf token should be stored in a cookie */
    cookie?: boolean | object;

    /** Array of methods that should be ignored by csrf protection */
    ignoreMethods?: string[];

    /** Custom key for the csrf token in the request */
    key?: string;

    /** Name of the header field for the csrf token */
    headerName?: string;

    /** Name of the form field for the csrf token */
    fieldName?: string;

    /** Value indicating if session is required for csrf validation */
    sessionKey?: string;

    /** A function to determine if this request is valid and should be verified */
    shouldVerify?: (req: any) => boolean;

    /** Value indicating if the csrf token value check should be case sensitive */
    caseSensitive?: boolean;
  }

  /**
   * Creates a middleware for CSRF token creation and validation.
   * This middleware adds a `csrfToken` method to the request object,
   * which can be used to create a token.
   */
  function csrf(options?: CsurfOptions): RequestHandler;

  export = csrf;
}