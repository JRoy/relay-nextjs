import { useEffect, useMemo, useRef, useState } from 'react';
import type { Environment } from 'react-relay';
import { loadQuery } from 'react-relay';
import type { GraphQLSingularResponse } from 'relay-runtime';
import type { AnyPreloadedQuery, UseRelayNextJsProps } from './component';
import { hydrateObject } from './json_meta';

export function useRelayNextjs(
  props: UseRelayNextJsProps,
  opts: { createClientEnvironment: () => Environment }
): { env: Environment; preloadedQuery?: AnyPreloadedQuery; CSN: boolean } {
  const hydratedRef = useRef(false);

  const [relayEnvironment] = useState(() => {
    if (props.preloadedQuery?.environment) {
      return props.preloadedQuery.environment;
    }

    const env = opts.createClientEnvironment();
    if (
      !hydratedRef.current &&
      props.payload &&
      props.payloadMeta &&
      props.operationDescriptor
    ) {
      hydratedRef.current = true;
      hydrateObject(props.payloadMeta, props.payload);

      env.commitPayload(
        props.operationDescriptor,
        (props.payload as GraphQLSingularResponse).data!
      );
    }

    return env;
  });

  const preloadedQuery = useMemo(() => {
    if (props.preloadedQuery) {
      return props.preloadedQuery;
    } else if (props.operationDescriptor) {
      return loadQuery(
        relayEnvironment,
        props.operationDescriptor.request.node,
        props.operationDescriptor.request.variables,
        { fetchPolicy: 'store-or-network' }
      );
    }
    return undefined;
  }, [props.preloadedQuery, props.operationDescriptor, relayEnvironment]);

  const prevQueryRef = useRef<AnyPreloadedQuery | undefined>(undefined);

  useEffect(() => {
    const prev = prevQueryRef.current;
    prevQueryRef.current = preloadedQuery;
    if (prev && prev !== preloadedQuery) {
      prev.dispose();
    }
  }, [preloadedQuery]);


  return { env: relayEnvironment, preloadedQuery, CSN: props.CSN };
}
