import { UICoreMixin } from './pl-ui-core.js?v=248';
import { UIStepsMixin } from './pl-ui-steps.js?v=248';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=248';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=248';
import { UIMediaMixin } from './pl-ui-media.js?v=248';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
