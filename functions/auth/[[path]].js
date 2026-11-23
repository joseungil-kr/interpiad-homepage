import {handleRequest} from '../../server/pages-api.mjs';
export const onRequest = ({request, env}) => handleRequest(request, env);
