import type { ClassroomPayload } from '@/lib/classroom/load-classroom';
import type { Scene, Stage } from '@/lib/types/stage';

export const SAMPLE_STAGE: Stage = {
  id: 'sample',
  name: 'Quantum Computing & AI: The Next Frontier',
  description:
    'Explore quantum superposition, entanglement, and real-time AI agents on your TV and mobile devices.',
  style: 'technology',
  createdAt: 1731196800000,
  updatedAt: 1731196800000,
};

export const SAMPLE_SCENES: Scene[] = [
  {
    id: 'scene-sample-1',
    stageId: 'sample',
    type: 'slide',
    title: 'Introduction to Quantum AI',
    order: 0,
    actions: [],
    content: {
      type: 'slide',
      canvas: {
        id: 'slide-canvas-1',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#0a0e17',
          themeColors: ['#38bdf8'],
          fontColor: '#f8fafc',
          fontName: 'Inter',
        },
        elements: [
          {
            id: 'el-badge-1',
            type: 'text',
            left: 60,
            top: 50,
            width: 380,
            height: 36,
            rotate: 0,
            content:
              '<p style="font-size: 14px; letter-spacing: 0.1em; color: #38bdf8; font-weight: 700; text-transform: uppercase;">✨ Living Room TV &amp; Mobile Learning</p>',
            defaultFontName: 'Inter',
            defaultColor: '#38bdf8',
          },
          {
            id: 'el-title-1',
            type: 'text',
            left: 60,
            top: 96,
            width: 880,
            height: 120,
            rotate: 0,
            content:
              '<h1 style="font-size: 42px; font-weight: 800; line-height: 1.15; color: #ffffff; margin: 0;">Quantum Computing &amp; AI Agents</h1>',
            defaultFontName: 'Inter',
            defaultColor: '#ffffff',
          },
          {
            id: 'el-desc-1',
            type: 'text',
            left: 60,
            top: 230,
            width: 880,
            height: 220,
            rotate: 0,
            content:
              '<p style="font-size: 20px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0;">Welcome to your TV &amp; mobile classroom! Learn quantum mechanics and artificial intelligence from the comfort of your living room sofa.</p><ul style="font-size: 18px; line-height: 1.6; color: #cbd5e1; padding-left: 24px; margin: 0;"><li><strong>D-Pad / Remote Navigation:</strong> Use Left/Right to jump scenes, Enter to interact.</li><li><strong>Couch Companion:</strong> Scan the QR code or pair your phone to participate in live quizzes.</li><li><strong>Daily Streak:</strong> Earn streak badges every day you tune in on your TV.</li></ul>',
            defaultFontName: 'Inter',
            defaultColor: '#94a3b8',
          },
        ],
      },
    },
  },
  {
    id: 'scene-sample-2',
    stageId: 'sample',
    type: 'slide',
    title: 'Superposition in Action',
    order: 1,
    actions: [],
    content: {
      type: 'slide',
      canvas: {
        id: 'slide-canvas-2',
        viewportSize: 1000,
        viewportRatio: 0.5625,
        theme: {
          backgroundColor: '#0a0e17',
          themeColors: ['#38bdf8'],
          fontColor: '#f8fafc',
          fontName: 'Inter',
        },
        elements: [
          {
            id: 'el-badge-2',
            type: 'text',
            left: 60,
            top: 50,
            width: 380,
            height: 36,
            rotate: 0,
            content:
              '<p style="font-size: 14px; letter-spacing: 0.1em; color: #a855f7; font-weight: 700; text-transform: uppercase;">⚛️ Core Physical Principles</p>',
            defaultFontName: 'Inter',
            defaultColor: '#a855f7',
          },
          {
            id: 'el-title-2',
            type: 'text',
            left: 60,
            top: 96,
            width: 880,
            height: 100,
            rotate: 0,
            content:
              '<h2 style="font-size: 38px; font-weight: 800; line-height: 1.2; color: #ffffff; margin: 0;">The Power of Superposition</h2>',
            defaultFontName: 'Inter',
            defaultColor: '#ffffff',
          },
          {
            id: 'el-desc-2',
            type: 'text',
            left: 60,
            top: 210,
            width: 880,
            height: 220,
            rotate: 0,
            content:
              '<p style="font-size: 20px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0;">While classical computers rely on binary bits (0 or 1), a quantum computer uses <strong>qubits</strong>.</p><div style="background: rgba(30, 41, 59, 0.7); border-left: 4px solid #38bdf8; padding: 16px 20px; border-radius: 8px; margin-top: 12px;"><p style="font-size: 20px; color: #38bdf8; font-weight: 600; margin: 0;">|Ψ⟩ = α|0⟩ + β|1⟩</p><p style="font-size: 17px; color: #cbd5e1; margin: 6px 0 0 0;">A qubit can exist as a linear combination of both states simultaneously until observed.</p></div>',
            defaultFontName: 'Inter',
            defaultColor: '#94a3b8',
          },
        ],
      },
    },
  },
  {
    id: 'scene-sample-3',
    stageId: 'sample',
    type: 'quiz',
    title: 'Knowledge Check: Quantum Principles',
    order: 2,
    actions: [],
    content: {
      type: 'quiz',
      questions: [
        {
          id: 'q-sample-1',
          type: 'single',
          question:
            'What fundamental quantum phenomenon allows a qubit to represent both 0 and 1 simultaneously?',
          options: [
            { value: 'A', label: 'Quantum Superposition' },
            { value: 'B', label: 'Classical Binary Clocking' },
            { value: 'C', label: 'Thermal Radiation' },
            { value: 'D', label: 'Relativistic Dilation' },
          ],
          answer: ['A'],
          analysis:
            'Quantum Superposition allows a quantum particle or qubit to exist in multiple potential states at once until a measurement forces wave-function collapse.',
          hasAnswer: true,
          points: 10,
        },
      ],
    },
  },
];

export const SAMPLE_CLASSROOM_PAYLOAD: ClassroomPayload = {
  stage: SAMPLE_STAGE,
  scenes: SAMPLE_SCENES,
};

export function isSampleClassroomId(id: string | null | undefined): boolean {
  if (!id) return true;
  const normalized = id.toLowerCase().trim();
  return (
    normalized === 'sample' ||
    normalized === 'demo' ||
    normalized === 'preview' ||
    normalized === 'living-room' ||
    normalized === 'tv'
  );
}
