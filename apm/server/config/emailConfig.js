EmailConfig = {};

var emailDomain = process.env.MAIL_DOMAIN || 'dummydomain.com'

EmailConfig.from = {
  from: 'Meteor APM <no-reply@' + emailDomain + '>',
  subject: 'Application Performance Monitoring for Meteor'
};
