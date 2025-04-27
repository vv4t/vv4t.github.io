"use strict";

import { get_asset } from "../core/assets.js";

let history = "";
const conversation_queue = [];
let text_is_locked = false;
let conversation_finished_callback = null;

const show_continue = document.getElementById("continue");
const text_area = document.getElementById("text");
text_area.value = history;
show_continue.hidden = true;

document.addEventListener("keyup", (e) => {
  if (e.keyCode === " ".charCodeAt(0)) {
    e.preventDefault();
    if (text_is_locked) return;
    
    if (conversation_queue.length > 0) {
      const line = conversation_queue.pop();
      if (conversation_queue.length === 0) {
        submit_text(line, conversation_finished_callback);
        show_continue.hidden = true;
      } else {
        submit_text(line);
      }
    }
  }
});

export function make_log_available(entry) {
  document.getElementById(`log_${entry}`).hidden = false;
}

export function play_conversation(name, finish_callback) {
  const text = get_asset(`assets/data/${name}.txt`);
  const lines = text.replaceAll("\r", "").split("\n\n").map((chunk) => chunk.replace(/\n/g, " ") + "\n\n").reverse();
  conversation_finished_callback = finish_callback;
  conversation_queue.push(...lines);
  submit_text(conversation_queue.pop());
}

export function submit_text(text, finish_callback) {
  const retry_conversation = () => {
    if (text_is_locked) {
      setTimeout(retry_conversation, 500);
    } else {
      show_log(0);
      history += text;
      play_text(text, 10, finish_callback);
    }
  };

  retry_conversation();
}

function show_log(entry) {
  if (entry > 0) {
    clear_text();
    play_text(get_asset(`assets/data/LOG${entry}.txt`), 1);
  } else {
    text_area.value = history;
  }
}

function clear_text() {
  text_area.value = "";
}

function get_log_buttons() {
  const log_buttons = [document.getElementById("log_main")];

  for (let i = 1; true; i++) {
    const log_button = document.getElementById(`log_${i}`);
    if (!log_button) break;
    log_buttons.push(log_button);
  }

  return log_buttons;
}

function lock_text() {
  text_is_locked = true;
  get_log_buttons().forEach((button) => {
    button.style.color = "#559955";
    button.disabled = true;
  });
}

function unlock_text() {
  text_is_locked = false;
  get_log_buttons().forEach((button) => {
    button.style.color = "#aaffaa";
    button.disabled = false;
  });
}

function play_text(text, delay, finish_callback) {
  lock_text();

  if (conversation_queue.length > 0) show_continue.hidden = true;

  text = text.replace("\r", "").split("\n\n").map((chunk) => chunk.replace(/\n/g, " ")).join("\n\n");
  
  for (let i = 0; i < text.length; i++) {
    setTimeout(() => {
      text_area.value += text[i];
      text_area.scrollTop = text_area.scrollHeight;
    }, (i + 1) * delay);
  }

  setTimeout(() => {
    unlock_text();
    if (conversation_queue.length > 0) show_continue.hidden = false;
    if (finish_callback) finish_callback();
  }, (text.length + 1) * delay);
}

get_log_buttons().forEach((button, i) => {
  button.addEventListener("click", () => show_log(i));
});
