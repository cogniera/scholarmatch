import { cloudinaryConfig } from './cloudinaryConfig';

const { cloudName } = cloudinaryConfig;
const BASE = `https://res.cloudinary.com/${cloudName}/image/upload`;

/** PDF resume → preview image thumbnail */
export function getResumePreviewUrl(publicId) {
  return `${BASE}/pg_1,w_400,h_520,c_fill,f_jpg,q_auto/${publicId}`;
}

/** Profile avatar with AI background removal + circular crop */
export function getProfileAvatarUrl(publicId, size = 200) {
  return `${BASE}/e_background_removal/c_thumb,w_${size},h_${size},g_face,r_max/f_auto,q_auto/${publicId}`;
}

/** Scholarship banner auto-cropped to 16:9 */
export function getScholarshipBannerUrl(publicId) {
  return `${BASE}/c_fill,w_800,h_450,g_auto,f_auto,q_auto/${publicId}`;
}

/** Circular logo thumbnail */
export function getScholarshipLogoUrl(publicId, size = 80) {
  return `${BASE}/c_thumb,w_${size},h_${size},g_face,r_max/f_auto,q_auto/${publicId}`;
}

/** Shareable social highlight card with text overlays */
export function getHighlightCardUrl(studentName, scholarshipName, amount, score) {
  const encodedStudent = encodeURIComponent(studentName);
  const encodedScholarship = encodeURIComponent(scholarshipName);
  const encodedAmount = encodeURIComponent(`$${amount.toLocaleString()}`);
  return `${BASE}/w_1200,h_630,c_fill,e_brightness:-20/` +
    `l_text:montserrat_48_bold:${encodedScholarship},co_white,g_north_west,x_60,y_60/` +
    `l_text:montserrat_72_bold:${encodedAmount},co_rgb:F5A623,g_west,x_60,y_40/` +
    `l_text:montserrat_28:AI%20Match%20Score%3A%20${score}%25,co_rgb:22C55E,g_south_west,x_60,y_100/` +
    `l_text:montserrat_24:Matched%20for%20${encodedStudent},co_rgb:E8EDF5,g_south_west,x_60,y_60/` +
    `l_text:montserrat_18:%40ScholarAI%20%23CloudinaryHackathon,co_rgb:6B7E9F,g_south_east,x_40,y_40/` +
    `cld-sample-4`;
}

/** Document thumbnail from uploaded PDF */
export function getDocumentThumbnailUrl(publicId) {
  return `${BASE}/pg_1,w_300,h_400,c_fit,f_jpg,q_auto/${publicId}`;
}
