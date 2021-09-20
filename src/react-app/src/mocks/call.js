import { v4 } from "uuid";

const defaultContacts = [
    'Lawrence W. Larson',
    'Noah Lane',
    'Pataky Pista',
    'Vladimír Brhel',
    'Lukáš Bařina',
    'Manaka Niiya',
    'Hella Tokareva',
    'Otto Mikaelsen',
    'Claudette Beaupré',
    'Paula Korhonen',
    'Archer Code',
    'Jin Maeda',
    'Leea Nikkola',
    'Michael Rabin',
    'Jasmine Cremor',
    'Human Torch',
    'Demolition Man',
    'Thomas Burton',
    'Charles Alderman',
    'Anne Ramirez',
    'Brad Halley',
    'Jesse Wingard',
    'Alexis Melville',
    'Stephanie McConnan',
    'Riley Blanchard'
]

const getRandomContact = () => {
    const index = Math.floor(Math.random() * defaultContacts.length);
    return defaultContacts[index];
}

const mockCall = {
    id: null,
    ringing: true,
    connected: false,
    muted: false,
    held: false,
    contactName: null,

    create: () => {
        mockCall.id = v4();
        mockCall.contactName = getRandomContact();
    },

    answer: () => {
        mockCall.ringing = false;
        mockCall.connected = true;
    },

    end: () => {
        mockCall.ringing = false;
        mockCall.connected = false
    }
}

export default mockCall;