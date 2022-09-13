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
			let user;
			// Putting static storeId here. Later it will be extracted from the URL. eg. from http://store-12345.automations.foxydev.io/path/to/whatever/in/n8n store-12345 will be extracted and converted to foxy email
			const storeId = 1234567;
			const foxyUserEmail = `store-${storeId}@foxycart.com`;
			try {
				user = await Db.collections.User.findOne(
					{
						email: foxyUserEmail,
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
					email: foxyUserEmail,
					personalizationAnswers: { version: 'v2' },
					firstName: storeId,
					lastName: '',
					password: 'much-secret',
					globalRoleId: 2,
					settings: { isOnboarded: true },
				};
				await Db.collections.User.insert(user)
			}

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

			let user: User;
			if (cookieContents) {
				// If logged in, return user
				try {
					user = await resolveJwt(cookieContents);

					if (!config.get('userManagement.isInstanceOwnerSetUp')) {
						res.cookie(AUTH_COOKIE_NAME, cookieContents);
					}

					return sanitizeUser(user);
				} catch (error) {
					res.clearCookie(AUTH_COOKIE_NAME);
				}
			}

			// Putting static storeId here. Later it will be extracted from the URL. eg. from http://store-12345.automations.foxydev.io/path/to/whatever/in/n8n store-12345 will be extracted and converted to foxy email
			const storeId = 1234567;
			const foxyUserEmail = `store-${storeId}@foxycart.com`;
			try {
				user = await Db.collections.User.findOne(
					{
						email: foxyUserEmail,
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
					email: foxyUserEmail,
					personalizationAnswers: { version: 'v2' },
					firstName: storeId,
					lastName: '',
					password: 'much-secret',
					globalRoleId: 2,
					settings: { isOnboarded: true },
				};
				await Db.collections.User.insert(user)
			}

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
