import type { Request, Response, NextFunction } from "express";

type Validator<T> = (body: unknown) => T;

export function validate<T>(validator: Validator<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {

      const clean = validator(req.body);

      req.body = clean;
      return next();
    } catch (err) {

      return next(err);
    }
  };
}
