class GameEngine {
    constructor(game) {
        this.game = game;
        this.win = false;
        this.inventory = [];
    }

    start() {
        this.room = this.game.room;
        return this.game.start() + "\n\n" + this.routes();
    }

    input(text) {
        text = text.toLowerCase().trim();
        const m = /(?<cmd>\S+)(\s+(?<args>.*))?/.exec(text);

        let resp;
        switch (m.groups.cmd) {
            case 'look':
                resp = this.look();
                break;

            case 'go':
            case 'move':
                resp = this.move(m.groups.args);
                break;

            case 'take':
                resp = this.take(m.groups.args);
                break;

            case 'use':
                resp = this.use(m.groups.args);
                break;

            default:
                resp = "Sorry, I don't know how to do that.";
        }

        if (this.win) {
            resp += "\n\n" + this.game.end();
        }

        return resp;
    }

    routes() {
        const routes = [];
        const room = this.game.map[this.room];
        Object.keys(room.link).forEach(dir => {
            const name = room.link[dir];
            routes.push(`The ${name} is to the [${dir}].`);
        });
        return routes.join("\n");
    }

    move(dir) {
        const room = this.game.map[this.room];
        for (const [d, r] of Object.entries(room.link)) {
            if (d.startsWith(dir)) {
                this.room = r;
                return this.game.map[r].desc(this) + "\n\n" + this.routes();
            }
        }

        return "There's nothing in that direction.";
    }

    look() {
        return this.game.map[this.room].desc(this);
    }

    take(obj) {
        if (typeof obj === 'undefined') {
            return 'Take what?';
        }
        obj = encodeURIComponent(obj);

        const room = this.game.map[this.room];
        if (room.items && room.items.includes(obj) && !this.inventory.includes(obj)) {
            this.inventory.push(obj);
            return `You took the ${obj}.`;
        }

        return `There is no ${obj} to take.`;
    }

    use(obj) {
        if (typeof obj === 'undefined') {
            return 'Use what?';
        }
        obj = encodeURIComponent(obj);

        const room = this.game.map[this.room];
        if (!this.inventory.includes(obj)) {
            return `You have no ${obj} to use.`;
        }

        if (room.use && typeof room.use[obj] === 'function') {
            return room.use[obj](this);
        }

        return `It makes no sense to use the ${obj} here.`;
    }
}

const game = new GameEngine({
    room: 'bedroom',
    start: () => "[Welcome to Castle Adventure!]\n\n"
        + "You rouse from your slumber to the cries of panicked servants. "
        + "A monster is loose in the castle!",
    end: () => "Congratulations! You've saved the castle... perhaps now "
        + "you'll be able to get a decent night's sleep.\n\n[The End.]",
    map: {
        'bedroom': {
            desc: () => "You're in your bedroom chamber. The fireplace "
                + "provides both warmth and gentle illumination.",
            link: {
                north: 'hallway'
            }
        },
        hallway: {
            desc: () => "All of the servants must have escaped because the "
                + "corridor is empty, but you sense the monster is still nearby.",
            link: {
                south: 'bedroom',
                east: 'study',
                west: 'kitchen',
            }
        },
        study: {
            desc: (ge) => "The study is filled with wall-to-wall shelves of "
                + "leatherbound books. A wooden desk rests in the middle "
                + "of the room" 
                + (!ge.inventory.includes('candlestick')
                    ? " upon which sits a silver [candlestick]."
                    : "."),
            link: {
                west: 'hallway'
            },
            items: [
                'candlestick'
            ]
        },
        kitchen: {
            desc: () => "The monster is rummaging for food in the pantry. "
                + "It's unclear whether the stench you smell is coming from " 
                + "the monster itself or the chef's left-over cassarole.",
            link: {
                east: 'hallway'
            },
            use: {
                candlestick: (ge) => {
                    ge.win = true;
                    return "You club the monster on the back of the head "
                        + "knocking it unconscious.";
                }
            }
        }
    }
});

const intro = document.getElementById('intro');
const button = document.getElementById('button');

const terminal = document.getElementById('terminal');
const command = document.getElementById('command');
const output = document.getElementById('output');
const input = document.getElementById('input');
const $prompt = document.getElementById('prompt').innerText;

button.addEventListener('click', (evt) => {
    intro.classList.add('hidden');
    terminal.classList.remove('hidden');

    const text = game.start();
    print(text, true);
    speak(text);

    command.focus();
});

terminal.addEventListener('click', (evt) => {
    command.focus();
});

command.addEventListener('keydown', (evt) => {
    if (evt.key == 'Enter') {
        evt.preventDefault();

        const text = command.value.trim();
        command.value = '';

        process(text);
    }
});

var SpeechRecognition = SpeechRecognition || webkitSpeechRecognition;

const recognition = new SpeechRecognition();
recognition.continuous = true;
//recognition.lang = 'en-US';

recognition.onresult = (evt) => {
    const text = evt.results[evt.results.length - 1][0].transcript;
    process(text);
};

function print(text, isHTML) {
    const div = document.createElement('div');
    if (isHTML) {
        div.innerHTML = 
            text.replaceAll('[', '<b>')
            .replaceAll(']', '</b>')
            .replaceAll("\n", '<br>');
    } else {
        div.innerText = text;
    }
    output.appendChild(div);

    terminal.scrollTop = terminal.scrollHeight;
}

function speak(text) {
    // remove HTML tags
    text = text.replace(/(<[^>]+>)/g, '');

    const  utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = (evt) => {
        if (!game.win) {
            recognition.start();
        }
    };

    recognition.stop();
    speechSynthesis.speak(utterance);
}

function process(text) {
    print(`${$prompt} ${text}`, false);
    if (!text) {
        return;
    }

    const txt = game.input(text);
    print("<br>" + txt, true);
    speak(txt);

    if (game.win) {
        recognition.stop();
        command.disabled = true;
        input.classList.add('hidden');
    }
}
