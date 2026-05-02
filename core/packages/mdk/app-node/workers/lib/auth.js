'use strict'
const { SUPER_ADMIN_ID, MIGRATED_USER_ROLES } = require('./constants')

class AuthLib {
  constructor ({ httpc, httpd, userService, auth }) {
    this._httpc = httpc
    this._httpd = httpd
    this._userService = userService
    this._auth = auth
  }

  async migrateUsers (httpdAuth) {
    const users = await this._auth.listUsers()
    if (users.length > 1) {
      // The super admin will already be present
      // Skip migration if other users are present
      return
    }

    try {
      const oldUsers = httpdAuth.conf.users || []

      const superAdmin = users.find(user => user.id.toString() === SUPER_ADMIN_ID)

      await Promise.all(oldUsers.map(async oldUser => {
        if (oldUser.email === superAdmin.email) {
          return // Skip super admin
        }

        const role = oldUser.write ? MIGRATED_USER_ROLES.DEFAULT : MIGRATED_USER_ROLES.READ_ONLY

        try {
          await this._userService.createUser({ email: oldUser.email, role })
        } catch (error) {
          console.error(`Failed to migrate user: ${oldUser.email}`, error)
        }
      }))
    } catch (error) {
      console.error('Unexpected error occurred during migration. Migration Failed!', error)
      throw error
    }
  }

  async start () {
    this._auth.addHandlers({
      google: this._resolveOAuthGoogle.bind(this),
      microsoft: this._resolveOAuthMicrosoft.bind(this)
    })
  }

  async regenerateToken ({ oldToken, ips, ttl = 300, pfx = 'pub', scope = 'api', roles = [] }) {
    return await this._auth.regenerateToken({
      oldToken,
      ips,
      ttl,
      pfx,
      scope,
      roles
    })
  }

  async resolveToken (token, ips) {
    return await this._auth.resolveToken(token, ips, { updateLastActive: true })
  }

  async getTokenPerms (token) {
    const { superadmin: superAdmin, perms = [] } = this._auth.getTokenPerms(token)
    const write = superAdmin || (await this._auth.tokenHasPerms(token, 'actions:w'))
    const applicablePerms = superAdmin ? (this._auth.conf.superAdminPerms ?? []) : perms
    const caps = applicablePerms.map(perm => perm.split(':')[0])

    return { write, caps, superAdmin, permissions: applicablePerms }
  }

  async tokenHasPerms (token, write, requestedPerms, matchAll = false) {
    const perms = await this.getTokenPerms(token)
    if (perms.superAdmin) {
      return true
    }

    if (write && !perms.write) {
      return false
    }

    const resolved = await Promise.all(requestedPerms.map(perm => this._auth.tokenHasPerms(token, perm)))

    return matchAll
      ? resolved.every(res => res)
      : resolved.some(res => res)
  }

  async cleanupTokens () {
    await this._auth.cleanupTokens()
  }

  async _resolveOAuthGoogle (ctx, req) {
    const oauthRes = await this._httpd.server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)
    const { body: info } = await this._httpc.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { authorization: 'Bearer ' + oauthRes.token.access_token },
        encoding: 'json'
      }
    )

    if (!info) {
      return null
    }

    return {
      email: info.email
    }
  }

  async _resolveOAuthMicrosoft (ctx, req) {
    let accessToken
    try {
      const oauthRes = await this._httpd.server.microsoftOAuth2.getAccessTokenFromAuthorizationCodeFlow(req)
      accessToken = oauthRes?.token?.access_token
    } catch (err) {
      const msg = err?.response?.body?.error_description || err?.message || 'ERR_MICROSOFT_TOKEN_EXCHANGE_FAILED'
      throw new Error(msg)
    }

    if (!accessToken) {
      throw new Error('ERR_MICROSOFT_TOKEN_MISSING')
    }

    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,otherMails', {
      headers: { authorization: 'Bearer ' + accessToken }
    })

    if (!graphRes.ok) {
      const bodyText = await graphRes.text()
      throw new Error(`ERR_MICROSOFT_GRAPH_${graphRes.status}: ${bodyText}`)
    }

    const profile = await graphRes.json()

    if (!profile) {
      return null
    }

    const isAzureGuestUpn = (value) => typeof value === 'string' && value.includes('#EXT#')
    const { mail, userPrincipalName, otherMails } = profile

    let email = null
    if (mail && !isAzureGuestUpn(mail)) {
      email = mail
    } else if (Array.isArray(otherMails) && otherMails[0]) {
      email = otherMails[0]
    } else if (mail) {
      email = mail
    } else if (userPrincipalName && !isAzureGuestUpn(userPrincipalName)) {
      email = userPrincipalName
    } else {
      email = userPrincipalName || null
    }

    if (!email) {
      return null
    }

    return { email }
  }
}

module.exports = AuthLib
