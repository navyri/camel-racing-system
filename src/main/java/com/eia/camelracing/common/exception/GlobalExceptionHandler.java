package com.eia.camelracing.common.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

        @ExceptionHandler(MethodArgumentNotValidException.class)
        public ResponseEntity<ErrorResponse> handleValidationException(
                        MethodArgumentNotValidException exception,
                        HttpServletRequest request) {
                Map<String, String> validationErrors = new LinkedHashMap<>();

                exception.getBindingResult()
                                .getFieldErrors()
                                .forEach(error -> validationErrors.putIfAbsent(
                                                error.getField(),
                                                error.getDefaultMessage()));

                exception.getBindingResult()
                                .getGlobalErrors()
                                .forEach(error -> validationErrors.putIfAbsent(
                                                error.getObjectName(),
                                                error.getDefaultMessage()));

                return ResponseEntity.badRequest().body(new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                                "Validation error in request data",
                                request.getRequestURI(),
                                validationErrors));
        }

        @ExceptionHandler(HandlerMethodValidationException.class)
        public ResponseEntity<ErrorResponse> handleHandlerMethodValidationException(
                        HandlerMethodValidationException exception,
                        HttpServletRequest request) {
                Map<String, String> validationErrors = new LinkedHashMap<>();

                exception.getParameterValidationResults()
                                .forEach(result -> result.getResolvableErrors()
                                                .forEach(error -> validationErrors.putIfAbsent(
                                                                result.getMethodParameter().getParameterName(),
                                                                error.getDefaultMessage())));

                return ResponseEntity.badRequest().body(new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                                "Validation error in request parameters",
                                request.getRequestURI(),
                                validationErrors));
        }

        @ExceptionHandler(ConflictException.class)
        public ResponseEntity<ErrorResponse> handleConflictException(
                        ConflictException exception,
                        HttpServletRequest request) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.CONFLICT.value(),
                                HttpStatus.CONFLICT.getReasonPhrase(),
                                exception.getMessage(),
                                request.getRequestURI()));
        }

        @ExceptionHandler(NoSuchElementException.class)
        public ResponseEntity<ErrorResponse> handleNoSuchElementException(
                        NoSuchElementException exception,
                        HttpServletRequest request) {
                String message = exception.getMessage() == null
                                ? "Requested resource was not found"
                                : exception.getMessage();

                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.NOT_FOUND.value(),
                                HttpStatus.NOT_FOUND.getReasonPhrase(),
                                message,
                                request.getRequestURI()));
        }

        @ExceptionHandler(IllegalArgumentException.class)
        public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
                        IllegalArgumentException exception,
                        HttpServletRequest request) {
                String message = exception.getMessage() == null
                                ? "Invalid request data"
                                : exception.getMessage();

                return ResponseEntity.badRequest().body(new ErrorResponse(
                                LocalDateTime.now(),
                                HttpStatus.BAD_REQUEST.value(),
                                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                                message,
                                request.getRequestURI()));
        }
}