Meteor.startup(() => {
  console.log('ROOT_URL=', process.env.ROOT_URL);
  console.log('Meteor.absoluteUrl(``)=', Meteor.absoluteUrl(``));
  var adminPass = process.env.ADMIN_PASSWORD || 'admin';

  if (!Meteor.users.findOne({ username: 'admin' })) {
    Accounts.createUser({
      username: 'admin',
      email: 'admin@admin.com',
      password: adminPass,
      plan: 'business'
    });
  }
});
