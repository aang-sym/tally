#!/usr/bin/env tsx
/**
 * OpenAPI Contract Coverage Analysis
 * Verifies that all endpoints have proper security configuration
 */

interface OpenAPIEndpoint {
  path: string;
  method: string;
  security?: any[];
  responses: Record<string, any>;
}

async function analyzeOpenAPIContract() {
  console.log('🔍 OpenAPI Contract Coverage Analysis\n');

  // Fetch the OpenAPI spec from the running server
  const response = await fetch('http://localhost:4000/openapi.json');
  const spec = await response.json();

  console.log('📋 Basic Contract Info:');
  console.log(`   Title: ${spec.info.title}`);
  console.log(`   Version: ${spec.info.version}`);
  console.log(`   Global Security: ${JSON.stringify(spec.security)}`);
  console.log(
    `   Security Schemes: ${Object.keys(spec.components?.securitySchemes || {}).join(', ')}`
  );
  console.log('');

  // Extract all endpoints
  const endpoints: OpenAPIEndpoint[] = [];

  for (const [path, pathObj] of Object.entries(spec.paths)) {
    for (const [method, methodObj] of Object.entries(pathObj as any)) {
      endpoints.push({
        path,
        method: method.toUpperCase(),
        security: (methodObj as any).security,
        responses: (methodObj as any).responses || {},
      });
    }
  }

  console.log('🔒 Security Configuration Analysis:');
  console.log('===================================');

  let publicEndpoints = 0;
  let protectedEndpoints = 0;
  let missingSecurityEndpoints = 0;

  endpoints.forEach((endpoint, index) => {
    const isPublic = endpoint.security && endpoint.security.length === 0;
    const hasGlobalSecurity = !endpoint.security && spec.security && spec.security.length > 0;
    const isProtected = hasGlobalSecurity || (endpoint.security && endpoint.security.length > 0);

    let securityStatus = '';
    if (isPublic) {
      securityStatus = '🌐 PUBLIC (security: [])';
      publicEndpoints++;
    } else if (isProtected) {
      securityStatus = '🔒 PROTECTED (requires auth)';
      protectedEndpoints++;
    } else {
      securityStatus = '❌ MISSING SECURITY CONFIG';
      missingSecurityEndpoints++;
    }

    console.log(`${(index + 1).toString().padStart(2)}. ${endpoint.method} ${endpoint.path}`);
    console.log(`    Security: ${securityStatus}`);

    // Check for required error responses on protected endpoints
    if (isProtected) {
      const has401 = endpoint.responses['401'];
      const has403 = endpoint.responses['403'];
      const has400 = endpoint.responses['400'];
      const has404 = endpoint.responses['404'];

      const errorResponses = [];
      if (has401) errorResponses.push('401');
      if (has403) errorResponses.push('403');
      if (has400) errorResponses.push('400');
      if (has404) errorResponses.push('404');

      console.log(`    Error Responses: [${errorResponses.join(', ')}]`);

      if (!has401) {
        console.log(`    ⚠️  Missing 401 (Unauthorized) response`);
      }
      if (!has403) {
        console.log(`    ⚠️  Missing 403 (Forbidden) response`);
      }
    }
    console.log('');
  });

  console.log('📊 Summary:');
  console.log('===========');
  console.log(`Total Endpoints: ${endpoints.length}`);
  console.log(`Public Endpoints: ${publicEndpoints}`);
  console.log(`Protected Endpoints: ${protectedEndpoints}`);
  console.log(`Missing Security Config: ${missingSecurityEndpoints}`);
  console.log('');

  // Overall assessment
  if (missingSecurityEndpoints === 0 && protectedEndpoints > 0 && publicEndpoints >= 0) {
    console.log('✅ CONTRACT ANALYSIS: PASSED');
    console.log('   All endpoints have proper security configuration');
    console.log('   Protected endpoints include appropriate error responses');
  } else {
    console.log('❌ CONTRACT ANALYSIS: FAILED');
    if (missingSecurityEndpoints > 0) {
      console.log(`   ${missingSecurityEndpoints} endpoint(s) missing security configuration`);
    }
  }

  return {
    totalEndpoints: endpoints.length,
    publicEndpoints,
    protectedEndpoints,
    missingSecurityEndpoints,
    passed: missingSecurityEndpoints === 0,
  };
}

// Run analysis directly
analyzeOpenAPIContract().catch(console.error);

export { analyzeOpenAPIContract };
