// Descriptions only: all prices and availability come from package_pricing.
export const PACKAGE_FEATURES = {
  Basic: ['1–2 hrs coverage', '25 edited photos', 'Private gallery link'],
  Standard: ['Up to 3 hrs coverage', '60 edited photos', 'Private gallery link', '1 free 5×7 print'],
  Premium: ['Full day coverage', '100+ edited photos', 'Private gallery link', '3 free 5×7 prints'],
};
export const packageFeatures = name => PACKAGE_FEATURES[name] || ['Photos included', 'Private gallery link'];
