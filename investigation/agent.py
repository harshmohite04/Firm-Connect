import os
from neo4j import GraphDatabase
from neo4j_graphrag.llm import OllamaLLM
from dotenv import load_dotenv

load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASS = os.getenv("NEO4J_PASS")
OLLAMA_LLM_MODEL = os.getenv("OLLAMA_LLM_MODEL", "llama3.2:latest")

class InvestigatorAgent:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS))
        self.llm = OllamaLLM(model_name=OLLAMA_LLM_MODEL, model_params={"temperature": 0.3})

    def run_investigation(self, case_id: str):
        """
        Executes a "Super Lawyer" deep investigation.
        Yields:
            - Status strings (for log)
            - 'GRAPH_UPDATE: <json>' (for UI visualization)
            - 'REPORT: <markdown>' (final product)
        """
        yield "Initializing Super Lawyer Engine..."
        
        # 1. Build the Knowledge Web (Graph Traversal)
        yield "Constructing evidential knowledge web..."
        entities = self._get_case_entities(case_id)
        
        # Send initial graph structure to UI
        graph_data = self._build_graph_data(entities)
        yield f"GRAPH_UPDATE: {graph_data}"
        
        if not entities:
            msg = "## Investigation Report\n\nNo significant entities or connections found to analyze."
            yield "No entities found."
            yield f"REPORT: {msg}"
            return

        yield f"Identified {len(entities)} key subjects in the case file."

        # 2. Deep Reasoning Loop
        findings = []
        timeline_events = []
        
        # Analyze top connected entities (The "Inner Circle")
        top_entities = sorted(entities, key=lambda x: x['degree'], reverse=True)[:5]
        
        for entity in top_entities:
            name = entity['name']
            label = entity['labels'][0] if entity['labels'] else "Entity"
            
            yield f"Cross-examining subject: {name} ({label})..."
            
            # A. Contextual Analysis & Contradiction Detection
            yield f"  > Retrieving verifyable claims involving {name}..."
            context_analysis = self._perform_deep_analysis(case_id, name)
            findings.append(context_analysis)
            
            # B. Timeline Reconstruction
            yield f"  > Reconstructing timeline events for {name}..."
            events = self._extract_timeline_events(case_id, name)
            timeline_events.extend(events)

        # 3. Synthesize "Super Lawyer" Report
        yield "formulating legal strategy and final dossier..."
        final_report = self._generate_super_lawyer_report(findings, timeline_events)
        
        yield "Investigation complete."
        yield f"REPORT: {final_report}"

    def _get_case_entities(self, case_id):
        """Retrieves main entities and their connection counts."""
        query = """
        MATCH (c:Chunk {caseId: $case_id})-[:MENTIONS]->(e:Entity)
        RETURN e.name as name, labels(e) as labels, count(c) as degree
        ORDER BY degree DESC
        LIMIT 20
        """
        with self.driver.session() as s:
            result = s.run(query, case_id=case_id)
            return [dict(r) for r in result]

    def _build_graph_data(self, entities):
        """Constructs a JSON representation of the graph for the frontend."""
        import json
        nodes = []
        links = []
        
        # Create Entity Nodes
        for e in entities:
            nodes.append({"id": e['name'], "group": "entity", "val": e['degree']})
            
        # Create phantom 'Document' nodes (for visual clustering) - simplified for now
        # We could add actual document nodes if we query for them, usually helpful for the 'Web'
        
        return json.dumps({"nodes": nodes, "links": links}) # Links will need a separate query if we want E-E links

    def _perform_deep_analysis(self, case_id, entity_name):
        """
        Retrieves snippets and asks LLM to find contradictions or key insights.
        """
        query = """
        MATCH (c:Chunk {caseId: $case_id})-[:MENTIONS]->(e:Entity {name: $name})
        RETURN c.source as source, c.text as text
        LIMIT 8
        """
        with self.driver.session() as s:
            results = s.run(query, case_id=case_id, name=entity_name)
            snippets = [f"[Source: {r['source']}] {r['text'][:300]}..." for r in results]
        
        if not snippets:
            return ""

        context_str = "\n".join(snippets)
        
        prompt = f"""
        ACT AS A SENIOR LEGAL INVESTIGATOR.
        Analyze the following evidence snippets regarding the subject: '{entity_name}'.
        
        YOUR TASKS:
        1. Identify the KEY FACTS established by the evidence.
        2. Detect any CONTRADICTIONS or INCONSISTENCIES between sources (Crucial!).
        3. Assess the CREDIBILITY or potential for impeachment.
        
        EVIDENCE:
        {context_str}
        
        OUTPUT FORMAT (Markdown):
        ### Subject: {entity_name}
        **Key Facts**: ...
        **Contradictions / Risks**: ...
        """
        try:
            return self.llm.invoke(prompt).content
        except Exception:
            return f"### Subject: {entity_name}\nAnalysis failed."

    def _extract_timeline_events(self, case_id, entity_name):
        """
        Asks LLM to extract specific timestamped events from the context.
        """
        # (Simplified: Re-using the analysis step or doing a quick separate pass)
        # For efficiency, we might skip a separate DB call if we cache context, but let's keep it simple.
        return [] # Placeholder to save tokens for now, or implement if needed.

    def _generate_super_lawyer_report(self, findings, timeline):
        combined_findings = "\n\n".join([f for f in findings if f])
        
        prompt = f"""
        ACT AS "THE SUPER LAWYER" - A world-class legal strategist.
        Write a high-stakes INTELLIGENCE DOSSIER based on the investigation findings below.
        
        TONE: Professional, incisive, authoritative, and strategic. 
        Don't just list facts—synthesize them into a CASE THEORY.
        
        FINDINGS:
        {combined_findings}
        
        REPORT STRUCTURE:
        # PIVOTAL INTELLIGENCE DOSSIER
        ## I. Executive Legal Strategy
        (Summarize the core case theory and primary risks)
        
        ## II. Key Witness & Subject Analysis
        (Deep dive into the subjects, highlighting contradictions)
        
        ## III. Interactive Web of Evidence
        (Reference the connections found)
        
        ## IV. Recommended Next Steps
        """
        try:
            return self.llm.invoke(prompt).content
        except Exception:
            return "Report generation failed."

# Global Instance
investigator = InvestigatorAgent()
