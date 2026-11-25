/**
 * Miniquiz - 3 questions from a variable bank.
 * Mock for H0 - just shows questions and allows passing.
 */

import { useState, useEffect } from 'react';
import { useGameStore, dispatch } from '@app/store';

const QUESTIONS = [
  {
    id: 1,
    question: '¿Qué tipo de cable se usa entre dispositivos de distinto tipo (ej. PC-Switch)?',
    options: ['Directo', 'Cruzado', 'Rollover', 'Fibra'],
    answer: 0,
  },
  {
    id: 2,
    question: 'En RIPv1, ¿qué máscara se asume para la red 192.168.10.0?',
    options: ['255.255.255.0', '255.255.0.0', '255.0.0.0', 'Variable (VLSM)'],
    answer: 0,
  },
  {
    id: 3,
    question: '¿Cuál es la métrica máxima en RIPv1 antes de considerar una red inalcanzable?',
    options: ['15', '16', '255', 'Infinita'],
    answer: 1,
  },
  {
    id: 4,
    question: '¿Qué comando borra la configuración de arranque (startup-config)?',
    options: ['erase startup-config', 'delete startup-config', 'clear config', 'reset config'],
    answer: 0,
  },
  {
    id: 5,
    question: '¿Qué puerto del router se usa para acceso por consola?',
    options: ['Console', 'Aux', 'G0/0', 'F0/1'],
    answer: 0,
  },
];

export function Quiz(): React.ReactElement | null {
  const phase = useGameStore(s => s.phase);
  const [selectedQuestions, setSelectedQuestions] = useState<typeof QUESTIONS>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState(false);

  // Pick 3 random questions on mount
  useEffect(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    setSelectedQuestions(shuffled.slice(0, 3));
  }, []);

  const handleAnswer = (questionId: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < selectedQuestions.length) return;

    let correct = 0;
    selectedQuestions.forEach(q => {
      if (answers[q.id] === q.answer) correct++;
    });

    setSubmitted(true);
    if (correct >= 3) { // Need all 3 correct per spec
      setPassed(true);
      // Auto-advance after short delay
      setTimeout(() => {
        dispatch.setPhase('TOOLS');
      }, 1000);
    }
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setPassed(false);
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
    setSelectedQuestions(shuffled.slice(0, 3));
  };

  if (phase !== 'QUIZ') return null;

  return (
    <div className="quiz">
      <div className="quiz-card">
        <h2>Miniquiz - Topología 1 / RIPv1</h2>
        <p className="quiz-note">Responda las 3 preguntas correctamente para acceder a la jaula.</p>

        {passed && (
          <div className="quiz-passed">
            <h3>¡Acceso concedido!</h3>
            <p>Redirigiendo a la jaula...</p>
          </div>
        )}

        {!passed && (
          <>
            <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
              {selectedQuestions.map(q => (
                <div key={q.id} className="question">
                  <p className="question-text">{q.question}</p>
                  <div className="options">
                    {q.options.map((opt, i) => (
                      <label key={i} className={`option ${answers[q.id] === i ? 'selected' : ''} ${submitted && i === q.answer ? 'correct' : ''} ${submitted && answers[q.id] === i && i !== q.answer ? 'incorrect' : ''}`}>
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={i}
                          checked={answers[q.id] === i}
                          onChange={() => handleAnswer(q.id, i)}
                          disabled={submitted}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="quiz-actions">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={Object.keys(answers).length < selectedQuestions.length || submitted}
                >
                  {submitted ? 'Verificando...' : 'Entregar'}
                </button>
                {submitted && !passed && (
                  <button type="button" className="btn-secondary" onClick={handleRetry}>
                    Reintentar
                  </button>
                )}
              </div>
            </form>

            {submitted && !passed && (
              <p className="quiz-fail">Necesita 3 aciertos. Inténtelo de nuevo.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}