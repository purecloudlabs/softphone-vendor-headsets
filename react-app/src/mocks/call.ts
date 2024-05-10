/* istanbul ignore file */
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
];

const getRandomContact = () => {
  const index = Math.floor(Math.random() * defaultContacts.length);
  return defaultContacts[index];
};

export default class MockCall {
    id: string;
    contactName: string;

    constructor () {
      this.id = v4();
      this.contactName = getRandomContact();
    }
}