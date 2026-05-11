package com.oraclebot.phase3.agent;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.oraclebot.phase3.config.AiProps;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class LlmIntentParser implements IntentParser {

    private static final Logger logger = LoggerFactory.getLogger(LlmIntentParser.class);

    private final AiProps aiProps;
    private final ObjectMapper objectMapper;
    private final RuleBasedIntentParser fallbackParser;

    public LlmIntentParser(AiProps aiProps, ObjectMapper objectMapper, RuleBasedIntentParser fallbackParser) {
        this.aiProps = aiProps;
        this.objectMapper = objectMapper;
        this.fallbackParser = fallbackParser;
    }

    @Override
    public ParsedIntent parse(String messageText) {
        if (!aiProps.isEnabled() || aiProps.getApiKey() == null || aiProps.getApiKey().isBlank()) {
            return fallbackParser.parse(messageText);
        }

        try {
            RestClient client = RestClient.builder()
                .baseUrl(aiProps.getBaseUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + aiProps.getApiKey())
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

            String systemPrompt = """
                Eres un clasificador de intenciones para un asistente de gestion agile.
                Debes responder solo JSON valido.
                Intenciones permitidas:
                HELP
                LIST_TASKS
                LIST_TASKS_BY_ASSIGNEE
                LIST_TASKS_BY_STATUS
                CREATE_TASK
                CURRENT_SPRINT_SUMMARY
                TEAM_LOAD_SUMMARY
                UNKNOWN

                Devuelve JSON con:
                intent, assignee, status, title, storyPoints, sprintName, clarificationNeeded, clarificationQuestion.
                Si falta informacion importante, pide aclaracion.
                """;

            Map<String, Object> payload = Map.of(
                "model", aiProps.getModel(),
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", messageText)
                ),
                "temperature", 0
            );

            String responseBody = client.post()
                .uri(URI.create("/chat/completions"))
                .body(payload)
                .retrieve()
                .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isMissingNode() || content.asText().isBlank()) {
                return fallbackParser.parse(messageText);
            }

            return objectMapper.readValue(content.asText(), ParsedIntent.class);
        } catch (Exception ex) {
            logger.warn("Fallo el parser LLM. Uso fallback local.", ex);
            return fallbackParser.parse(messageText);
        }
    }
}

