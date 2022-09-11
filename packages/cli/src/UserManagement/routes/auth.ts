/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Request, Response } from 'express';
import { IDataObject } from 'n8n-workflow';
import { Db, ResponseHelper } from '../..';
import { AUTH_COOKIE_NAME } from '../../constants';
import { issueCookie, resolveJwt } from '../auth/jwt';
import { N8nApp, PublicUser } from '../Interfaces';
import { compareHash, sanitizeUser } from '../UserManagementHelper';
import { User } from '../../databases/entities/User';
import type { LoginRequest } from '../../requests';
import config = require('../../../config');

export function authenticationMethods(this: N8nApp): void {
	/**
	 * Log in a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: LoginRequest, res: Response): Promise<PublicUser> => {
			console.log('coming here')
			// if (!req.body.email) {
			// 	throw new Error('Email is required to log in');
			// }

			// if (!req.body.password) {
			// 	throw new Error('Password is required to log in');
			// }

			let user;
			try {
				user = await Db.collections.User.findOne(
					{
						storeId: 123456,
					},
					{
						relations: ['globalRole'],
					},
				);
			} catch (error) {
				throw new Error('Unable to access database.');
			}

			if (!user) {
				user = {
					id: 'sadfsdfadfs',
					email: '123456',
					personalizationAnswers: { version: 'v2' },
					firstName: 'foxy',
					lastName: 'Cart',
					password: 'something Random',
					globalRoleId: 2,
					settings: { isOnboarded: true },
					storeId: 123456,
				};
				await Db.collections.User.insert(user)
			}

			// if (!user || !user.password || !(await compareHash(req.body.password, user.password))) {
			// 	// password is empty until user signs up
			// 	const error = new Error('Wrong username or password. Do you have caps lock on?');
			// 	// @ts-ignore
			// 	error.httpStatusCode = 401;
			// 	throw error;
			// }

			await issueCookie(res, user);

			return sanitizeUser(user);
		}),
	);

	/**
	 * Manually check the `n8n-auth` cookie.
	 */
	this.app.get(
		`/${this.restEndpoint}/login`,
		ResponseHelper.send(async (req: Request, res: Response): Promise<PublicUser> => {
			// Manually check the existing cookie.
			const cookieContents = req.cookies?.[AUTH_COOKIE_NAME] as string | undefined;
			console.log('cookie:', cookieContents)
			let user: User;
			if (cookieContents) {
				console.log('inside if');
				// If logged in, return user
				try {
				console.log('inside try');

					user = await resolveJwt(cookieContents);
console.log('user:', user);
					if (!config.get('userManagement.isInstanceOwnerSetUp')) {
						res.cookie(AUTH_COOKIE_NAME, cookieContents);
					}

					return sanitizeUser(user);
				} catch (error) {
					console.log('error:', error)
					res.clearCookie(AUTH_COOKIE_NAME);
				}
			}

			const url = req.protocol + '://' + req.get('host') + req.originalUrl;
			const storeId = 1234;
			console.log('first time auth failed', user);

			// if (config.get('userManagement.isInstanceOwnerSetUp')) {
			// 	const error = new Error('Not logged in');
			// 	// @ts-ignore
			// 	error.httpStatusCode = 401;
			// 	throw error;
			// }

			try {
				user = await Db.collections.User.findOne(
					{
						storeId: 6718,
					},
					{
						relations: ['globalRole'],
					},
				);
				// user = await Db.collections.User.findOneOrFail({ relations: ['globalRole'] });
			} catch (error) {
				throw new Error(
					'No users found in database - did you wipe the users table? Create at least one user.',
				);
			}

			if (!user) {
				user = {
					id: 'sadfsd1fadf45s',
					email: '6178',
					firstName: 'foxy',
					lastName: 'Cart',
					password: 'something Random',
					personalizationAnswers: { version: 'v2' },
					globalRoleId: 2,
					settings: { isOnboarded: true },
					storeId: 6718,
				};
				await Db.collections.User.insert(user)
			}

			// try {
			// 	user = await Db.collections.User.findOneOrFail({ relations: ['globalRole'] });
			// } catch (error) {
			// 	throw new Error(
			// 		'No users found in database - did you wipe the users table? Create at least one user.',
			// 	);
			// }

			// if (user.email || user.password) {
			// 	throw new Error('Invalid database state - user has password set.');
			// }

			await issueCookie(res, user);

			return sanitizeUser(user);
		}),
	);

	/**
	 * Log out a user.
	 *
	 * Authless endpoint.
	 */
	this.app.post(
		`/${this.restEndpoint}/logout`,
		ResponseHelper.send(async (_, res: Response): Promise<IDataObject> => {
			res.clearCookie(AUTH_COOKIE_NAME);
			return {
				loggedOut: true,
			};
		}),
	);
}
