EmailTemplates = {};

var newCollabTmpl = i18n('share.collaborator_invite_email_tmpl');
EmailTemplates.notifyNewCollaborator = _.template(newCollabTmpl);

var forNewCollabTmpl = i18n('share.new_collaborator_invite_email_tmpl');
EmailTemplates.notifyForNewCollaborator = _.template(forNewCollabTmpl);

var newOwnerTemp = i18n('share.notify_new_owner_email_templ');
EmailTemplates.notifyNewOwner = _.template(newOwnerTemp);

var forNewOwnerTemp = i18n('share.notify_for_new_owner_email_templ');
EmailTemplates.notifyForNewOwner = _.template(forNewOwnerTemp);