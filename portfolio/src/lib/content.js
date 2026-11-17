// The site's content, with anything still marked as a [PLACEHOLDER] in
// content/site.json left out, so unfinished items never show on the site or in
// the resume PDF. Fill an item in and it appears on the next deploy.
import raw from '../content/site.json';

const BRACKETS = /\[[^\]]*\]/g;
const unfilled = value => typeof value === 'string' && /\[[^\]]*\]/.test(value);
// A sentence or phrase with the placeholder part removed ("" if nothing is left).
const text = value => typeof value === 'string' ? value.replace(BRACKETS, '').replace(/\s+/g, ' ').replace(/^[\s–—-]+|[\s–—-]+$/g, '').trim() : '';
// Dates and labels are all-or-nothing: "[START YEAR] – present" becomes "".
const whole = value => unfilled(value) ? '' : (value || '');
const kept = (list, key) => (list || []).filter(item => item[key] && !unfilled(item[key]));

const a = raw.academics, r = raw.resume, i = raw.interests;

export default {
  ...raw,
  tagline: whole(raw.tagline),
  about: { ...raw.about, intro: raw.about.intro.filter(p => !unfilled(p)) },
  academics: {
    school: whole(a.school), graduation: whole(a.graduation),
    facts: kept(a.facts, 'value'),
    tests: kept(a.tests, 'score').map(t => ({ ...t, detail: whole(t.detail) })),
    courses: a.courses.map(c => ({ year: whole(c.year), classes: c.classes.filter(name => !unfilled(name)) })).filter(c => c.year && c.classes.length),
    awards: kept(a.awards, 'title').map(w => ({ ...w, year: whole(w.year), detail: whole(w.detail) })),
  },
  projects: kept(raw.projects, 'title').map(p => ({ ...p, dates: whole(p.dates), summary: text(p.summary), links: p.links.filter(l => l.href && !unfilled(l.label)) })),
  interests: {
    sideProjects: kept(i.sideProjects, 'title').map(p => ({ ...p, summary: text(p.summary) })),
    interests: i.interests.filter(name => !unfilled(name)),
  },
  resume: {
    ...r,
    summary: whole(r.summary), pdfSummary: whole(r.pdfSummary),
    sections: r.sections.map(s => ({
      heading: s.heading,
      items: kept(s.items, 'title').map(item => ({ title: item.title, meta: whole(item.meta), points: item.points.filter(point => !unfilled(point)) })),
    })).filter(s => s.items.length),
  },
};
