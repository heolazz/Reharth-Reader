import { Book } from './types';

const LOREM_IPSUM = `
Chapter 1: The Beginning

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula eu tempor congue, eros est euismod turpis, id tincidunt sapien risus a quam. Maecenas fermentum consequat mi. Donec fermentum. Pellentesque malesuada nulla a mi. Duis sapien sem, aliquet nec, commodo eget, consequat quis, neque. Aliquam faucibus, elit ut dictum aliquet, felis nisl adipiscing sapien, sed malesuada diam lacus eget erat. Cras mollis scelerisque nunc. Nullam arcu. Aliquam consequat. Curabitur augue lorem, dapibus quis, laoreet et, pretium ac, nisi. Aenean magna nisl, mollis quis, molestie eu, feugiat in, orci. In hac habitasse platea dictumst.`;

// Musee/Reharth Color Palette
export const EARTHY_COLORS = [
  '#638367', // Muted Sage Green
  '#E6B768', // Mustard Yellow / Ocher
  '#D64038', // Coral Red
  '#3D3028', // Dark Espresso
  '#CC8B65', // Terracotta
  '#5C6D70', // Slate Teal
];

import { HighlightColor } from './types';

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#fef08a', // yellow-200
  green: '#bbf7d0', // green-200
  blue: '#bfdbfe', // blue-200
  pink: '#fbcfe8', // pink-200
};

export const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'Psychology of Money',
    author: 'Morgan Housel',
    color: '#638367', // Sage
    icon: 'brain',
    tags: ['Finance', 'Psychology', 'Wealth'],
    year: '2020',
    summary: 'Timeless lessons on wealth, greed, and happiness. Housel shares 19 short stories exploring the strange ways people think about money.',
    height: 1.1,
    fileType: 'text',
    content: `Doing well with money isn’t necessarily about what you know. It’s about how you behave.\n\n${LOREM_IPSUM}`
  },
  {
    id: '2',
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    color: '#E6B768', // Mustard
    icon: 'fingerprint',
    tags: ['History', 'Anthropology'],
    year: '2011',
    summary: 'A brief history of humankind. From the Stone Age to the Silicon Age, Harari explores what it means to be human.',
    height: 1.2,
    fileType: 'text',
    content: `A Brief History of Humankind.\n\n${LOREM_IPSUM}`
  },
  {
    id: '3',
    title: 'The Metamorphosis',
    author: 'Franz Kafka',
    color: '#D64038', // Red
    icon: 'bug',
    tags: ['Fiction', 'Classic', 'Surrealism'],
    year: '1915',
    summary: 'The story of a salesman, Gregor Samsa, who wakes one morning to find himself inexplicably transformed into a huge insect.',
    height: 1.05,
    fileType: 'text',
    content: `As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a gigantic insect.\n\n${LOREM_IPSUM}`
  },
  {
    id: '4',
    title: 'The 48 Laws of Power',
    author: 'Robert Greene',
    color: '#3D3028', // Dark
    icon: 'crown',
    tags: ['Strategy', 'Psychology', 'Power'],
    year: '1998',
    summary: 'A pragmatic primer for people who want to understand power—how to acquire it, how to defend against it, and how to use it.',
    height: 1.15,
    fileType: 'text',
    content: `Law 1: Never Outshine the Master.\n\n${LOREM_IPSUM}`
  },
  {
    id: '5',
    title: 'Atomic Habits',
    author: 'James Clear',
    color: '#CC8B65', // Terracotta
    icon: 'zap',
    tags: ['Self-Help', 'Productivity'],
    year: '2018',
    summary: 'An easy and proven way to build good habits and break bad ones. Changes that seem small and unimportant at first will compound into remarkable results.',
    height: 1.1,
    fileType: 'text',
    content: `Tiny Changes, Remarkable Results.\n\n${LOREM_IPSUM}`
  },
  {
    id: '6',
    title: 'Deep Work',
    author: 'Cal Newport',
    color: '#5C6D70', // Slate
    icon: 'anchor',
    tags: ['Productivity', 'Career', 'Focus'],
    year: '2016',
    summary: 'Rules for focused success in a distracted world. Deep work is the ability to focus without distraction on a cognitively demanding task.',
    height: 1.1,
    fileType: 'text',
    content: `Rules for Focused Success in a Distracted World.\n\n${LOREM_IPSUM}`
  }
];