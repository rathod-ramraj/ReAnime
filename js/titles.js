const Titles = {
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

  searchHaystack(anime) {
    const raw = anime.raw || {};
    return [
      anime.title,
      anime.titleEnglish,
      anime.titleRomaji,
      anime.altTitle,
      raw.title,
      raw.title_english,
      raw.title_japanese,
      ...(anime.synonyms || []),
      ...(raw.title_synonyms || []),
    ].filter(Boolean).join(' ').toLowerCase();
  },

  STOP_WORDS: new Set([
    'a', 'an', 'the', 'i', 'in', 'to', 'of', 'is', 'it', 'with', 'me', 'you', 'your',
    'and', 'or', 'on', 'at', 'for', 'be', 'my', 'its', 'that', 'this', 'are', 'was',
    'as', 'by', 'do', 'no', 'so', 'if', 'up', 'we', 'he', 'she', 'they', 'them', 'our',
  ]),

  significantWords(query) {
    return query.toLowerCase().trim().split(/\s+/).filter(
      (w) => w.length >= 3 && !this.STOP_WORDS.has(w),
    );
  },

  searchMatchScore(query, anime) {
    const q = query.toLowerCase().trim();
    const hay = this.searchHaystack(anime);
    const sig = this.significantWords(q);

    if (!hay || !q) return 99;
    if (hay === q) return 0;
    if (hay.startsWith(q) || q.startsWith(hay)) return 1;
    if (hay.includes(q)) return 2;
    if (sig.length && sig.every((w) => hay.includes(w))) return 3;

    if (sig.length) {
      const matched = sig.filter((w) => hay.includes(w)).length;
      const ratio = matched / sig.length;
      if (ratio >= 0.75) return 4;
      if (ratio >= 0.5) return 5;
    }

    return 99;
  },

  filterAndRankSearch(query, items) {
    if (!items.length) return [];

    const sig = this.significantWords(query);
    const strictMax = sig.length >= 5 ? 4 : sig.length >= 3 ? 5 : 6;

    const rank = (maxScore) => items
      .map((item) => ({ item, score: this.searchMatchScore(query, item) }))
      .filter((row) => row.score <= maxScore)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return (b.item.score || 0) - (a.item.score || 0);
      })
      .map((row) => row.item);

    const filtered = rank(strictMax);
    if (filtered.length) return filtered;

    const loose = rank(99).filter((item) => this.searchMatchScore(query, item) < 99);
    if (loose.length) return loose.slice(0, 24);

    return items.slice(0, 24);
  },
};
