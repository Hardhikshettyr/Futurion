import { useEffect, useRef, useState } from "react";
import {
  askSkillCoach,
  getCoachConversation,
  getCoachConversations,
  getSkillAiStatus,
} from "../../services/skillApi.js";

const STARTERS = [
  "What are my biggest competency gaps based on my current records?",
  "Which of my existing skills can help me learn a recommended skill?",
  "How can I demonstrate one of my self-declared skills?",
  "Which missing prerequisite should I address first, and why?",
];

function SkillGapCoachPanel() {
  const [history, setHistory] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [message, setMessage] = useState("");
  const [available, setAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([getCoachConversations({ page: 1, limit: 20 }), getSkillAiStatus()])
      .then(([result, status]) => {
        if (!active) return;
        setHistory(result.items || []);
        setAvailable(status.available);
      })
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === "function") {
      endRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [conversation?.messages?.length]);

  async function openConversation(id) {
    setError("");
    try {
      const result = await getCoachConversation(id);
      setConversation(result.conversation);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function send(event) {
    event?.preventDefault();
    const question = message.trim();
    if (!question) return;
    setIsSending(true);
    setError("");
    try {
      const result = await askSkillCoach({ conversationId: conversation?.id, message: question });
      setConversation(result.conversation);
      setHistory((current) => {
        const without = current.filter((item) => item.id !== result.conversation.id);
        return [result.conversation, ...without];
      });
      setMessage("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) return <div className="profile-loading">Loading development guidance…</div>;

  return (
    <div className="coach-layout">
      <aside className="skill-panel coach-history">
        <div><p className="eyebrow">Your conversations</p><button type="button" className="secondary-button mt-3 w-full" onClick={() => { setConversation(null); setMessage(""); }}>New conversation</button></div>
        <div className="coach-history-list">
          {history.map((item) => <button key={item.id} type="button" className={conversation?.id === item.id ? "active" : ""} onClick={() => openConversation(item.id)}><strong>{item.title}</strong><span>{item.messageCount} messages · {new Date(item.updatedAt).toLocaleDateString()}</span></button>)}
          {!history.length && <p>No conversations yet.</p>}
        </div>
      </aside>

      <section className="coach-window">
        <header className="coach-header">
          <div><span className="ai-generated-label">Development guidance</span><h2>Skill Development Coach</h2><p>Guidance is grounded in your records and the central Skill Library.</p></div>
          <span className={`ai-status-dot ${available ? "available" : ""}`}>{available ? "Guidance available" : "Currently unavailable"}</span>
        </header>

        <div className="coach-messages" aria-live="polite">
          {!conversation?.messages?.length && (
            <div className="coach-welcome">
              <p className="eyebrow">Start with your real context</p>
              <h3>Ask why a gap exists—or what to do next.</h3>
              <p>The coach can explain your recorded prerequisites, evidence gaps, and recommendations. It cannot change your profile.</p>
              <div>{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => setMessage(starter)}>{starter}</button>)}</div>
            </div>
          )}
          {conversation?.messages?.map((item) => (
            <article key={item.id} className={`coach-message coach-message-${item.role}`}>
              <div className="coach-message-meta"><strong>{item.role === "assistant" ? "Futurion Coach" : "You"}</strong>{item.role === "assistant" && <span>Advisory response</span>}</div>
              <p>{item.content}</p>
              {item.knownFacts?.length > 0 && <details><summary>Facts used</summary><ul>{item.knownFacts.map((fact, index) => <li key={`${fact.statement}-${index}`}><span>{fact.statement}</span><small>{fact.source}</small></li>)}</ul></details>}
              {item.suggestions?.length > 0 && <div className="coach-suggestions"><strong>Suggestions</strong>{item.suggestions.map((suggestion, index) => <p key={`${suggestion.statement}-${index}`}>{suggestion.statement}<small>{suggestion.rationale}</small></p>)}</div>}
              {item.unavailableInformation?.length > 0 && <div className="coach-unknown"><strong>Information not provided</strong><ul>{item.unavailableInformation.map((unknown) => <li key={unknown}>{unknown}</li>)}</ul></div>}
              {item.followUpQuestions?.length > 0 && <div className="coach-followups">{item.followUpQuestions.map((question) => <button key={question} type="button" onClick={() => setMessage(question)}>{question}</button>)}</div>}
            </article>
          ))}
          {isSending && <div className="coach-thinking"><span /><span /><span /> Grounding an answer in your records…</div>}
          <div ref={endRef} />
        </div>

        {error && <div className="profile-alert profile-alert-error mx-5 mb-3" role="alert">{error}</div>}
        <form className="coach-composer" onSubmit={send}>
          <label className="sr-only" htmlFor="coach-question">Ask the Skill Development Coach</label>
          <textarea id="coach-question" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1200} rows={2} placeholder="Ask about a skill, prerequisite, evidence gap, or recommendation…" disabled={!available || isSending} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(event); } }} />
          <button type="submit" className="primary-button" disabled={!available || isSending || !message.trim()}>{isSending ? "Thinking…" : "Ask coach"}</button>
        </form>
        <footer>Conversation limit: 20 messages. Suggestions never modify your records.</footer>
      </section>
    </div>
  );
}

export default SkillGapCoachPanel;
