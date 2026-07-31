import { UICoreMixin } from './pl-ui-core.js?v=220';
import { UIStepsMixin } from './pl-ui-steps.js?v=220';
import { UIDraftsMixin } from './pl-ui-drafts.js?v=220';
import { UIInteractionsMixin } from './pl-ui-interactions.js?v=220';
import { UIMediaMixin } from './pl-ui-media.js?v=220';

export const UIMixin = Object.assign(
  {},
  UICoreMixin,
  UIStepsMixin,
  UIDraftsMixin,
  UIInteractionsMixin,
  UIMediaMixin
);
