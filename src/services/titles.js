export const Titles = {
  buildDisplayTitle(item) {
    const romaji = (item.title || item.titleRomaji || '').trim();
    const english = (item.title_english || item.titleEnglish || '').trim();
    const japanese = (item.title_japanese || item.altTitle || '').trim();
    const synonyms = item.title_synonyms || item.synonyms || [];

    let display = english;

    if (display && romaji) {
      const romajiRoot = romaji.split(':')[0].trim();
      const prefix = display.match(/^([^:–—-]+)/)?.[1]?.trim();
      const rest = display.slice(prefix?.length || 0).replace(/^[:\s–—-]+/, '').trim();
      const canInject = romajiRoot.length > 2
        && romajiRoot.length <= 36
        && prefix
        && rest
        && !display.toLowerCase().includes(romajiRoot.toLowerCase());
      if (canInject) {
        display = `${prefix}: ${romajiRoot} – ${rest}`;
      }
    }

    if (!display) {
      const engSyn = synonyms
        .filter((s) => /^[A-Za-z0-9]/.test(s))
        .sort((a, b) => b.length - a.length)[0];
      display = engSyn || romaji;
    }

    if (!display && romaji && japanese) display = `${romaji} (${japanese})`;
    if (!display) display = romaji || japanese || 'Untitled';

    if (!/demon slayer/i.test(display)) {
      const franchiseSyn = synonyms.find((s) => /demon slayer/i.test(s));
      if (franchiseSyn && /kimetsu/i.test(display + romaji)) {
        if (!/^demon slayer/i.test(display)) {
          display = `Demon Slayer: ${display}`;
        }
      }
    }

    return display.replace(/\s+/g, ' ').trim();
  },

  shortRating(rating) {
    if (!rating) return '';
    const m = String(rating).match(/^([A-Z]+-?\d*|G|PG)/i);
    return m ? m[1].toUpperCase() : '';
  },

  searchMetaLine(anime) {
    const parts = [];
    const rating = this.shortRating(anime.rating);
    if (rating) parts.push(rating);
    parts.push(anime.score ? `★ ${anime.score}` : '★');
    if (anime.type) parts.push(anime.type);
    if (anime.year) parts.push(anime.year);
    return parts.join(' / ');
  },

  heroMetaLine(anime) {
    const parts = [];
    const rating = this.shortRating(anime.rating);
    if (rating) parts.push(rating);
    if (anime.score) parts.push(`★ ${anime.score}`);
    if (anime.type) parts.push(anime.type);
    if (anime.year) parts.push(anime.year);
    return parts.join(' · ');
  },

  detailRatingBadge(rating) {
    const s = this.shortRating(rating);
    return s || null;
  },

  pickBestTitle(anime) {
    if (!anime) return '';
    return this.buildDisplayTitle({
      title: anime.titleRomaji || anime.title,
      title_english: anime.titleEnglish || anime.title_english,
      title_japanese: anime.altTitle || anime.title_japanese,
      title_synonyms: anime.synonyms || anime.title_synonyms,
    });
  },

  franchiseCardTitle(entry) {
    const raw = entry.titleEnglish || entry.titleRomaji || entry.title || '';
    return raw.replace(/^Demon Slayer:\s*/i, '').replace(/^Kimetsu no Yaiba:\s*/i, '').trim() || raw;
  },

  franchiseBadge(relation, type) {
    const rel = (relation || '').toLowerCase();
    if (rel.includes('sequel')) return 'Next';
    if (rel.includes('prequel')) return 'Prequel';
    if (rel.includes('side')) return 'Side';
    if (rel.includes('parent')) return 'Main';
    if (rel.includes('summary')) return 'Recap';
    if (rel.includes('spin-off')) return 'Spin-off';
    if (rel.includes('alternative')) return 'Alt';
    if (type === 'Movie') return 'Movie';
    if (type === 'OVA' || type === 'ONA') return type;
    return 'Related';
  },

  cleanRelationLabel(relation) {
    if (!relation) return 'Related';
    return relation.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  },
};
