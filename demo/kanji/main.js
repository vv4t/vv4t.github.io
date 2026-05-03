
const result = document.getElementById("result");
const jisho_query = document.getElementById("jisho_query");
const lookup = document.getElementById("lookup");

document.getElementById("clear").addEventListener("click", () => jisho_query.innerText = "");
jisho_query.addEventListener("click", () => jisho_query.innerText = "");

function do_search(query, data) {
  const is_kanji = [...query].some(char => char.charCodeAt(0) > 127);
  if (is_kanji) {
    search_kanji(query, data);
  } else {
    search_radical(query, data);
  }
}

function search_kanji(query, data) {
  const kanji = query[0];
  if (!(kanji in data.inverted_index))
    return;
  
  result.innerHTML = "";
  for (const radical of data.inverted_index[kanji]) {
    result.innerHTML = `${radical} ${data.terms[radical]}; `;
  }
}

function search_radical(query, data) {
  const terms = query.split(" ");
  const existing_terms = terms.filter((term) => term in data.inverted_terms);
  const mapped_terms = existing_terms.map((term) => data.inverted_terms[term]);
  const kanji_sets = mapped_terms.map((term) => new Set(data.index[term]));
  
  const sort_fn = (a, b) => data.strokes[a] - data.strokes[b];
  
  result.innerHTML = "";
  if (kanji_sets.length > 0) {
    const filtered_kanji = kanji_sets.reduce((a, b) => a.intersection(b));
    const sorted_result = Array.from(filtered_kanji).sort(sort_fn);
    
    for (const kanji of sorted_result) {
      const item = document.createElement("span");
      item.innerText = kanji;
      item.style = "padding-right: 4px;"
      item.addEventListener("click", () => {
        lookup.value = "";
        jisho_query.innerText += kanji;
        jisho_query.href = "https://jisho.org/search/" + jisho_query.innerText;
      });
      result.appendChild(item);
    }
  }
}

async function load() {
  const request = await fetch("data.json");
  const data = await request.json();
  
  const parsed_data = {
    index: data["index"],
    strokes: data["strokes"],
    terms: invert_index(data["terms"]),
    inverted_terms: data["terms"],
    inverted_index: invert_index(data["index"]),
  };
  
  let backoff_timeout;
  lookup.addEventListener("keyup", () => {
    if (backoff_timeout)
      clearTimeout(backoff_timeout);
    backoff_timeout = setTimeout(() => do_search(lookup.value, parsed_data), 200);
  });
}

function invert_index(index) {
  const inverted = {};
  for (const [key, entries] of Object.entries(index)) {
    for (const entry of entries) {
      if (!(entry in inverted))
        inverted[entry] = [];
      inverted[entry].push(key);
    }
  }
  return inverted;
}

load();
