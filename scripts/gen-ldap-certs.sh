#!/bin/bash
set -e

CERTS=./certs

echo "Generating LDAP internal CA..."
openssl genrsa -out $CERTS/ldap-ca-key.pem 4096
printf "[req]\ndistinguished_name=dn\nextensions=v3_ca\n[dn]\n[v3_ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\n" > $CERTS/ca-ext.cnf
openssl req -new -x509 -days 3650 \
  -key $CERTS/ldap-ca-key.pem \
  -out $CERTS/ldap-ca.pem \
  -subj "/CN=IT Portal Internal CA/O=IT Portal" \
  -extensions v3_ca \
  -config $CERTS/ca-ext.cnf
rm -f $CERTS/ca-ext.cnf

echo "Generating LDAP server cert (CN=openldap)..."
openssl genrsa -out $CERTS/ldap.key 2048
openssl req -new \
  -key $CERTS/ldap.key \
  -out $CERTS/ldap.csr \
  -subj "/CN=openldap/O=IT Portal"
printf "subjectAltName=DNS:openldap,DNS:localhost" > $CERTS/ldap-ext.cnf
openssl x509 -req -days 3650 \
  -in $CERTS/ldap.csr \
  -CA $CERTS/ldap-ca.pem \
  -CAkey $CERTS/ldap-ca-key.pem \
  -CAcreateserial \
  -out $CERTS/ldap.crt \
  -extfile $CERTS/ldap-ext.cnf
rm -f $CERTS/ldap.csr $CERTS/ldap-ca.srl $CERTS/ldap-ext.cnf

chmod 600 $CERTS/ldap.key $CERTS/ldap-ca-key.pem

echo ""
echo "Done."
echo "Safe to use: certs/ldap-ca.pem, certs/ldap.crt"
echo "KEEP PRIVATE:  certs/ldap.key, certs/ldap-ca-key.pem"
