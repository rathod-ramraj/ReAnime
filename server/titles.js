const Titles = {
  buildDisplayTitle(item) {
    const romaji = (item.title || '').trim();
    const english = (item.title_english || '').trim();
    const japanese = (item.title_japanese || '').trim();
    const synonyms = item.title_synonyms || [];

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
};

module.exports = { Titles };
