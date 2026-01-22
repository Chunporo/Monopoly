import { useState, useEffect } from "react";
import "./QuizModal.css";

export interface QuizQuestion {
	id: number;
	category: string;
	question: string;
	options: string[];
	correctIndex: number;
	difficulty?: "easy" | "medium" | "hard";
}

interface QuizModalProps {
	question: QuizQuestion;
	onCorrect: () => void;
	onWrong: () => void;
	onClose?: () => void;
    timeLimit?: number;
}

export default function QuizModal({
	question,
	onCorrect,
	onWrong,
	onClose,
    timeLimit = 15,
}: QuizModalProps) {
	const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
	const [answered, setAnswered] = useState(false);
	const [isCorrect, setIsCorrect] = useState(false);
    const [timeLeft, setTimeLeft] = useState(timeLimit);

    useEffect(() => {
        if (answered) return;

        if (timeLeft <= 0) {
            setAnswered(true);
            setIsCorrect(false);
            setTimeout(() => {
                onWrong();
            }, 1500);
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, answered]);

	const handleAnswerClick = (index: number) => {
		if (answered) return;

		setSelectedIndex(index);
		setAnswered(true);

		const correct = index === question.correctIndex;
		setIsCorrect(correct);

		// Delay callback to show result animation
		setTimeout(() => {
			if (correct) {
				onCorrect();
			} else {
				onWrong();
			}
		}, 1500);
	};

	const getDifficultyColor = (difficulty?: string) => {
		switch (difficulty) {
			case "easy":
				return "#4CAF50";
			case "medium":
				return "#FF9800";
			case "hard":
				return "#F44336";
			default:
				return "#2196F3";
		}
	};

	const getDifficultyText = (difficulty?: string) => {
		switch (difficulty) {
			case "easy":
				return "DỄ";
			case "medium":
				return "TRUNG BÌNH";
			case "hard":
				return "KHÓ";
			default:
				return "";
		}
	};

	const getButtonClass = (index: number) => {
		if (!answered) return "quiz-option";
		if (index === question.correctIndex) return "quiz-option correct";
		if (index === selectedIndex) return "quiz-option wrong";
		return "quiz-option disabled";
	};

	return (
		<div className="quiz-modal-overlay" data-show="true">
			<div className="quiz-modal" data-show="true">
				<div className="quiz-header">
					<span
						className="quiz-category"
						style={{
							backgroundColor: getDifficultyColor(question.difficulty),
						}}
					>
						{question.category}
					</span>
					{question.difficulty && (
						<span className="quiz-difficulty" data-difficulty={question.difficulty}>
							{getDifficultyText(question.difficulty)}
						</span>
					)}
				</div>

                <div className="quiz-timer-container">
                    <div className="quiz-timer-bar">
                        <div 
                            className="quiz-timer-fill" 
                            style={{ width: `${(timeLeft / timeLimit) * 100}%`, backgroundColor: timeLeft < 5 ? '#F44336' : '#4CAF50' }}
                        ></div>
                    </div>
                    <span className="quiz-timer-text">{timeLeft}s</span>
                </div>

				<div className="quiz-question">
					<p>{question.question}</p>
				</div>

				<div className="quiz-options">
					{question.options.map((option, index) => (
						<button
							key={index}
							className={getButtonClass(index)}
							onClick={() => handleAnswerClick(index)}
							disabled={answered}
						>
							<span className="option-letter">
								{String.fromCharCode(65 + index)}
							</span>
							<span className="option-text">{option}</span>
						</button>
					))}
				</div>

				{answered && (
					<div className={`quiz-result ${isCorrect ? "correct" : "wrong"}`}>
						{isCorrect ? (
							<>
								<span className="result-icon">✓</span>
								<span className="result-text">Chính xác!</span>
							</>
						) : (
							<>
								<span className="result-icon">✗</span>
								<span className="result-text">Sai rồi!</span>
							</>
						)}
					</div>
				)}

				{onClose && (
					<button className="quiz-close-btn" onClick={onClose}>
						×
					</button>
				)}
			</div>
		</div>
	);
}
