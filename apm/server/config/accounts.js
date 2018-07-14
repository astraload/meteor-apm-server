var emailDomain = process.env.MAIL_DOMAIN || 'dummydomain.com'

Accounts.emailTemplates.siteName = i18n('common.site_name');
Accounts.emailTemplates.from = 'Meteor APM <no-reply@' + emailDomain + '>';
Accounts.emailTemplates.resetPassword.subject = function() {
  return i18n('emails.reset_password_subject');
};
