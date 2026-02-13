import { useEffect, useRef, useState } from 'react';
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

  const [preloadedQuery, setPreloadedQuery] = useState<
    AnyPreloadedQuery | undefined
  >(() => {
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
  });

  const prevPreloadedQueryProp = useRef(props.preloadedQuery);

  useEffect(() => {
    if (
      props.preloadedQuery &&
      props.preloadedQuery !== prevPreloadedQueryProp.current
    ) {
      prevPreloadedQueryProp.current = props.preloadedQuery;
      setPreloadedQuery((prev) => {
        if (prev && prev !== props.preloadedQuery) {
          prev.dispose();
        }
        return props.preloadedQuery;
      });
    }
  }, [props.preloadedQuery]);

  useEffect(() => {
    return () => {
      setPreloadedQuery((prev) => {
        if (prev) {
          prev.dispose();
        }
        return undefined;
      });
    };
  }, []);

  return { env: relayEnvironment, preloadedQuery, CSN: props.CSN };
}
